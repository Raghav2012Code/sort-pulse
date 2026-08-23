import { computed, readonly, ref, shallowRef } from 'vue'
import {
  ALGORITHM_META,
  DISTRIBUTION_META,
  GENERATORS,
  generateArray,
} from '@/lib/algorithms'
import { soundEngine } from '@/lib/audio'
import type {
  ArrayDistributionKey,
  BarModel,
  BarState,
  EngineStatus,
  SortingAlgorithmKey,
  SortGenerator,
  SortStep,
  Telemetry,
} from '@/lib/types'

/**
 * Reactive sorting engine with generator replay, dynamic batching,
 * telemetry instrumentation, sound synthesis, and distribution presets.
 */
export function useSortingEngine() {
  // ----- reactive state exposed to the UI -----
  const status = ref<EngineStatus>('idle')
  const algorithm = ref<SortingAlgorithmKey>('bubble')
  const distribution = ref<ArrayDistributionKey>('random')
  const speed = ref(60)
  const arraySize = ref(40)
  const soundEnabled = ref(false)
  const telemetry = shallowRef<Telemetry>({ comparisons: 0, writes: 0, accesses: 0 })
  const elapsedMs = ref(0)
  const bars = shallowRef<BarModel[]>([])
  const statusMessage = ref('Ready to sort')

  // ----- non-reactive run-time bookkeeping -----
  let generator: SortGenerator | null = null
  let workingArray: number[] = []
  let sortedFlags: boolean[] = []
  let pool: BarModel[] = []
  let maxHeight = 100
  let stepTimer: ReturnType<typeof setTimeout> | null = null
  let timeRAF: number | null = null
  let runStart = 0
  let accumulatedMs = 0

  // ------------------------------------------------------------------
  // Bar view-model
  // ------------------------------------------------------------------
  function buildPool(values: number[]) {
    maxHeight = Math.max(...values, 1)
    pool = values.map((value, id) => {
      const model: BarModel = {
        id,
        value,
        state: 'default',
        get heightPct() {
          return (this.value / maxHeight) * 100
        },
      }
      return model
    })
    refreshBarsArray()
  }

  function setValue(idx: number, value: number) {
    const bar = pool[idx]
    if (bar) bar.value = value
  }

  /** Recompose every bar's state from sorted flags + a transient highlight. */
  function refreshBarsArray(transient?: { indices: number[]; state: BarState }) {
    for (const bar of pool) {
      let state: BarState = sortedFlags[bar.id] ? 'sorted' : 'default'
      if (transient && transient.indices.includes(bar.id)) {
        state = transient.state
      }
      bar.state = state
    }
    bars.value = Array.from(pool)
  }

  // ------------------------------------------------------------------
  // Timer & telemetry
  // ------------------------------------------------------------------
  function resetTelemetry() {
    telemetry.value = { comparisons: 0, writes: 0, accesses: 0 }
    accumulatedMs = 0
    runStart = 0
    elapsedMs.value = 0
  }

  function stopTimer() {
    if (timeRAF !== null) cancelAnimationFrame(timeRAF)
    timeRAF = null
  }

  function keepTime(_now: number) {
    if (status.value === 'running') {
      elapsedMs.value = accumulatedMs + (performance.now() - runStart)
      timeRAF = requestAnimationFrame(keepTime)
    }
  }

  function beginTimer() {
    if (timeRAF === null) {
      runStart = performance.now()
      timeRAF = requestAnimationFrame(keepTime)
    }
  }

  // ------------------------------------------------------------------
  // Step application
  // ------------------------------------------------------------------
  function applyStep(step: SortStep) {
    let transient: { indices: number[]; state: BarState } | null = null

    switch (step.type) {
      case 'compare': {
        const [a, b] = step.indices
        transient = { indices: step.indices, state: 'comparing' }
        if (pool[a] && pool[b]) {
          statusMessage.value = `Comparing index [${a}] (${pool[a].value}) with [${b}] (${pool[b].value})`
          if (soundEnabled.value) {
            soundEngine.playTone(pool[a].value, maxHeight, 'compare')
          }
        }
        break
      }
      case 'swap': {
        const [a, b] = step.indices
        if (a !== b && pool[a] && pool[b]) {
          const tmp = pool[a].value
          pool[a].value = pool[b].value
          pool[b].value = tmp
          statusMessage.value = `Swapping index [${a}] (${pool[b].value}) and [${b}] (${pool[a].value})`
          if (soundEnabled.value) {
            soundEngine.playTone(pool[a].value, maxHeight, 'swap')
          }
        }
        transient = { indices: step.indices, state: 'swapping' }
        break
      }
      case 'overwrite': {
        const [idx] = step.indices
        if (step.value !== undefined) {
          setValue(idx, step.value)
          statusMessage.value = `Writing value ${step.value} to index [${idx}]`
          if (soundEnabled.value) {
            soundEngine.playTone(step.value, maxHeight, 'overwrite')
          }
        }
        transient = { indices: step.indices, state: 'overwriting' }
        break
      }
      case 'sorted': {
        if (step.range) {
          for (let i = step.range[0]; i <= step.range[1]; i++) sortedFlags[i] = true
          statusMessage.value = `Sub-array [${step.range[0]}..${step.range[1]}] sorted in place`
        } else {
          for (const idx of step.indices) {
            sortedFlags[idx] = true
            statusMessage.value = `Element at index [${idx}] finalized in sorted position`
          }
        }
        break
      }
    }

    refreshBarsArray(transient ?? undefined)
  }

  /** Advances the generator by a single step. Returns true when the sort ends. */
  function runOneStep(): boolean {
    const res = generator?.next()
    if (!res || res.done) {
      for (let i = 0; i < sortedFlags.length; i++) sortedFlags[i] = true
      refreshBarsArray()
      return true
    }
    const step = res.value
    if (step) applyStep(step)
    return false
  }

  // ------------------------------------------------------------------
  // Lifecycle & Performance Timing Curve
  // ------------------------------------------------------------------
  function createRun() {
    workingArray = generateArray(arraySize.value, distribution.value)
    generator = GENERATORS[algorithm.value](workingArray, telemetry.value)
    buildPool(workingArray)
  }

  function stopLoop() {
    if (stepTimer !== null) clearTimeout(stepTimer)
    stepTimer = null
  }

  /**
   * Calculates dynamic batching and delay parameters:
   * Returns { delayMs: number, stepsPerBatch: number }
   */
  function calculateExecutionTiming(speedVal: number): { delay: number; stepsPerTick: number } {
    if (speedVal <= 40) {
      // 1 to 40: 1 step per tick, delay 240ms down to 18ms
      const ratio = (40 - speedVal) / 39
      const delay = Math.round(18 + Math.pow(ratio, 1.8) * 222)
      return { delay, stepsPerTick: 1 }
    } else if (speedVal <= 75) {
      // 41 to 75: 1 to 4 steps per tick, delay 16ms down to 4ms
      const progress = (speedVal - 40) / 35
      const steps = Math.floor(1 + progress * 3)
      const delay = Math.round(16 - progress * 12)
      return { delay, stepsPerTick: steps }
    } else {
      // 76 to 100: 4 to 28 steps per tick, minimal delay (0-2ms)
      const progress = (speedVal - 75) / 25
      const steps = Math.floor(4 + Math.pow(progress, 1.5) * 24)
      return { delay: 0, stepsPerTick: steps }
    }
  }

  function tick() {
    if (status.value !== 'running') return

    const { delay, stepsPerTick } = calculateExecutionTiming(speed.value)
    let finished = false

    for (let i = 0; i < stepsPerTick; i++) {
      if (runOneStep()) {
        finished = true
        break
      }
    }

    if (finished) {
      accumulatedMs += performance.now() - runStart
      elapsedMs.value = accumulatedMs
      stopTimer()
      status.value = 'complete'
      const meta = ALGORITHM_META[algorithm.value]
      statusMessage.value = `${meta.label} completed in ${elapsedMs.value.toFixed(1)}ms (${telemetry.value.comparisons} comparisons)`
      return
    }

    stepTimer = setTimeout(tick, delay)
  }

  function beginRun() {
    status.value = 'running'
    beginTimer()
    tick()
  }

  // ----- public control API -----
  function reset() {
    stopLoop()
    stopTimer()
    resetTelemetry()
    sortedFlags = new Array(arraySize.value).fill(false)
    createRun()
    status.value = 'idle'
    statusMessage.value = `Generated ${arraySize.value} elements (${DISTRIBUTION_META[distribution.value].label})`
  }

  function start() {
    if (status.value === 'running') return
    if (status.value === 'complete') reset()
    if (status.value === 'paused') {
      resume()
      return
    }
    if (pool.length === 0 || status.value === 'idle') {
      resetTelemetry()
      sortedFlags = new Array(arraySize.value).fill(false)
      createRun()
    }
    beginRun()
  }

  function pause() {
    if (status.value !== 'running') return
    stopTimer()
    stopLoop()
    accumulatedMs += performance.now() - runStart
    elapsedMs.value = accumulatedMs
    status.value = 'paused'
    statusMessage.value = 'Execution paused'
  }

  function resume() {
    if (status.value !== 'paused') return
    beginRun()
  }

  function stepForward() {
    if (status.value === 'running') return
    stopLoop()
    if (status.value === 'complete' || pool.length === 0) reset()
    if (status.value === 'idle') {
      stopTimer()
      resetTelemetry()
      sortedFlags = new Array(arraySize.value).fill(false)
      createRun()
      if (runOneStep()) {
        status.value = 'complete'
      } else {
        status.value = 'paused'
        beginTimer()
      }
      return
    }
    // paused mid-run
    if (runOneStep()) {
      accumulatedMs += performance.now() - runStart
      elapsedMs.value = accumulatedMs
      stopTimer()
      status.value = 'complete'
    }
  }

  function selectAlgorithm(key: SortingAlgorithmKey) {
    if (key === algorithm.value) return
    stopLoop()
    stopTimer()
    algorithm.value = key
    reset()
  }

  function setDistribution(key: ArrayDistributionKey) {
    if (key === distribution.value) return
    stopLoop()
    stopTimer()
    distribution.value = key
    reset()
  }

  function setSpeed(v: number) {
    speed.value = v
  }

  function setArraySize(n: number) {
    if (n === arraySize.value) return
    stopLoop()
    stopTimer()
    arraySize.value = n
    reset()
  }

  function toggleSound() {
    const next = soundEngine.toggle()
    soundEnabled.value = next
  }

  function dispose() {
    stopLoop()
    stopTimer()
  }

  return {
    status: readonly(status),
    bars: readonly(bars),
    telemetry: readonly(telemetry),
    elapsed: readonly(elapsedMs),
    algorithm: readonly(algorithm),
    algorithmMeta: computed(() => ALGORITHM_META[algorithm.value]),
    distribution: readonly(distribution),
    distributionMeta: computed(() => DISTRIBUTION_META[distribution.value]),
    speed: readonly(speed),
    arraySize: readonly(arraySize),
    soundEnabled: readonly(soundEnabled),
    statusMessage: readonly(statusMessage),
    selectAlgorithm,
    setDistribution,
    setSpeed,
    setArraySize,
    toggleSound,
    start,
    pause,
    resume,
    reset,
    stepForward,
    dispose,
  }
}
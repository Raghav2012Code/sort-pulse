import { computed, readonly, ref, shallowRef } from 'vue'
import { ALGORITHM_META, GENERATORS, randomArray } from '@/lib/algorithms'
import type {
  BarModel,
  BarState,
  EngineStatus,
  SortStep,
  SortingAlgorithmKey,
  SortGenerator,
  Telemetry,
} from '@/lib/types'

/**
 * Reactive sorting engine.
 *
 * Owns the array bars (a plain object pool re-exposed through a shallowRef so
 * the template observes a fresh reference per frame without proxying every
 * bar), the generator lifecycle, the timing loop, and live telemetry.
 */
export function useSortingEngine() {
  // ----- reactive state exposed to the UI -----
  const status = ref<EngineStatus>('idle')
  const algorithm = ref<SortingAlgorithmKey>('bubble')
  const speed = ref(50)
  const arraySize = ref(50)
  const telemetry = shallowRef<Telemetry>({ comparisons: 0, writes: 0, accesses: 0 })
  const elapsedMs = ref(0)
  const bars = shallowRef<BarModel[]>([])

  // ----- non-reactive run-time bookkeeping -----
  let generator: SortGenerator | null = null
  let workingArray: number[] = []
  let sortedFlags: boolean[] = []
  let pool: BarModel[] = []
  let maxHeight = 0
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
      if (transient && transient.indices.includes(bar.id)) state = transient.state
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
      case 'compare':
        transient = { indices: step.indices, state: 'comparing' }
        break
      case 'swap': {
        const [a, b] = step.indices
        if (a !== b && pool[a] && pool[b]) {
          const tmp = pool[a].value
          pool[a].value = pool[b].value
          pool[b].value = tmp
        }
        transient = { indices: step.indices, state: 'swapping' }
        break
      }
      case 'overwrite': {
        if (step.value !== undefined) setValue(step.indices[0], step.value)
        transient = { indices: step.indices, state: 'overwriting' }
        break
      }
      case 'sorted': {
        if (step.range) {
          for (let i = step.range[0]; i <= step.range[1]; i++) sortedFlags[i] = true
        } else {
          for (const idx of step.indices) sortedFlags[idx] = true
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
  // Lifecycle
  // ------------------------------------------------------------------
  function createRun() {
    workingArray = randomArray(arraySize.value)
    generator = GENERATORS[algorithm.value](workingArray, telemetry.value)
    buildPool(workingArray)
  }

  function stopLoop() {
    if (stepTimer !== null) clearTimeout(stepTimer)
    stepTimer = null
  }

  function resolveDelay(speedVal: number): number {
    // 0..100 -> ~260ms down to ~1ms on an exponential curve.
    const ratio = 1 - (speedVal - 1) / 99
    return Math.round(260 * Math.pow(ratio, 2)) + 1
  }

  function tick() {
    if (status.value !== 'running') return
    if (runOneStep()) {
      accumulatedMs += performance.now() - runStart
      elapsedMs.value = accumulatedMs
      stopTimer()
      status.value = 'complete'
      return
    }
    stepTimer = setTimeout(tick, resolveDelay(speed.value))
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

  function dispose() {
    stopLoop()
    stopTimer()
  }

  // ------------------------------------------------------------------
  // Exposed surface
  // ------------------------------------------------------------------
  return {
    status: readonly(status),
    bars: readonly(bars),
    telemetry: readonly(telemetry),
    elapsed: readonly(elapsedMs),
    algorithm: readonly(algorithm),
    algorithmMeta: computed(() => ALGORITHM_META[algorithm.value]),
    speed: readonly(speed),
    arraySize: readonly(arraySize),
    selectAlgorithm,
    setSpeed,
    setArraySize,
    start,
    pause,
    resume,
    reset,
    stepForward,
    dispose,
  }
}
<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from 'vue'
import { TabsList, TabsRoot, TabsTrigger } from 'radix-vue'
import {
  Activity,
  ArrowLeftRight,
  Clock,
  Eye,
  Pause,
  Play,
  RotateCcw,
  Shuffle,
  StepForward,
  Volume2,
  VolumeX,
} from '@lucide/vue'
import { useSortingEngine } from '@/composables/useSortingEngine'
import { ALGORITHM_LIST, DISTRIBUTION_LIST } from '@/lib/algorithms'
import type { ArrayDistributionKey, BarState, SortingAlgorithmKey } from '@/lib/types'
import { cn } from '@/lib/utils'

import Button from '@/components/ui/button/Button.vue'
import Badge from '@/components/ui/badge/Badge.vue'
import { Card, CardContent } from '@/components/ui/card'
import Slider from '@/components/ui/slider/Slider.vue'
import StatCard from '@/components/StatCard.vue'
import ShortcutsModal from '@/components/ShortcutsModal.vue'
import AlgorithmInfoCard from '@/components/AlgorithmInfoCard.vue'

const engine = useSortingEngine()

const algorithmModel = computed<SortingAlgorithmKey>({
  get: () => engine.algorithm.value,
  set: (key) => engine.selectAlgorithm(key),
})

const distributionModel = computed<ArrayDistributionKey>({
  get: () => engine.distribution.value,
  set: (key) => engine.setDistribution(key),
})

const isRunning = computed(() => engine.status.value === 'running')
const isPaused = computed(() => engine.status.value === 'paused')
const isComplete = computed(() => engine.status.value === 'complete')

const playIcon = computed(() => (isRunning.value ? Pause : Play))
const playLabel = computed(() => {
  if (isRunning.value) return 'Pause'
  if (isPaused.value) return 'Resume'
  if (isComplete.value) return 'Re-run'
  return 'Start'
})

const elapsedDisplay = computed(() => {
  const ms = engine.elapsed.value
  if (ms < 1000) return `${ms.toFixed(0)} ms`
  return `${(ms / 1000).toFixed(2)} s`
})

const speedModel = computed<number[]>({
  get: () => [engine.speed.value],
  set: (next) => engine.setSpeed(next[0] ?? 50),
})

const sizeModel = computed<number[]>({
  get: () => [engine.arraySize.value],
  set: (next) => engine.setArraySize(next[0] ?? 40),
})

function handlePauseToggle() {
  if (isRunning.value) engine.pause()
  else engine.start()
}

function handleStep() {
  engine.stepForward()
}

function handleShuffle() {
  engine.reset()
}

function barStateClass(state: BarState): string {
  switch (state) {
    case 'comparing':
      return 'bar-comparing shadow-xs shadow-rose-500/20'
    case 'swapping':
      return 'bar-swapping shadow-xs shadow-amber-500/30'
    case 'overwriting':
      return 'bar-overwriting shadow-xs shadow-sky-400/20'
    case 'sorted':
      return 'bar-sorted'
    default:
      return 'bar-default'
  }
}

/** Status dot color for the run-state readout. */
function statusDotClass(): string {
  if (isComplete.value) return 'bg-emerald-500 ring-4 ring-emerald-500/20'
  if (isRunning.value) return 'bg-amber-500 animate-pulse ring-4 ring-amber-500/20'
  if (isPaused.value) return 'bg-zinc-300'
  return 'bg-zinc-600'
}

function statusBadgeVariant(): 'default' | 'amber' | 'success' | 'secondary' {
  if (isComplete.value) return 'success'
  if (isRunning.value) return 'amber'
  if (isPaused.value) return 'secondary'
  return 'default'
}

function statusLabel(): string {
  if (isComplete.value) return 'Completed'
  if (isRunning.value) return 'Sorting'
  if (isPaused.value) return 'Paused'
  return 'Idle'
}

// Global keyboard shortcuts
function handleKeyDown(e: KeyboardEvent) {
  // Ignore when focused inside form elements
  const target = e.target as HTMLElement
  if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return

  if (e.code === 'Space') {
    e.preventDefault()
    handlePauseToggle()
  } else if (e.code === 'ArrowRight') {
    e.preventDefault()
    handleStep()
  } else if (e.key.toLowerCase() === 'r' || e.key.toLowerCase() === 's') {
    e.preventDefault()
    handleShuffle()
  } else if (e.key.toLowerCase() === 'm') {
    e.preventDefault()
    engine.toggleSound()
  } else if (['1', '2', '3', '4', '5', '6'].includes(e.key)) {
    const idx = parseInt(e.key, 10) - 1
    const algo = ALGORITHM_LIST[idx]
    if (algo) {
      e.preventDefault()
      engine.selectAlgorithm(algo.id)
    }
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
  // Initialize default array
  engine.reset()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown)
  engine.dispose()
})
</script>

<template>
  <main class="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:py-8">
    <!-- Header -->
    <header class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800/80 pb-5">
      <div class="flex items-center gap-3">
        <!-- Logo Mark -->
        <div class="flex size-9 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
          <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="4" y1="20" x2="4" y2="14" />
            <line x1="9" y1="20" x2="9" y2="8" />
            <line x1="14" y1="20" x2="14" y2="4" />
            <line x1="19" y1="20" x2="19" y2="11" />
          </svg>
        </div>
        <div>
          <div class="flex items-center gap-2">
            <h1 class="text-base sm:text-lg font-bold tracking-tight text-zinc-100">
              Sort Pulse
            </h1>
            <Badge :variant="statusBadgeVariant()" class="gap-1.5 py-0.5 text-[10px]">
              <span class="size-1.5 rounded-full" :class="statusDotClass()" />
              {{ statusLabel() }}
            </Badge>
          </div>
          <p class="text-xs text-zinc-400">
            Real-time interactive sorting algorithm visualizer & telemetry
          </p>
        </div>
      </div>

      <!-- Header actions: Sound toggle & Shortcuts -->
      <div class="flex items-center gap-2 self-start sm:self-auto">
        <Button
          variant="ghost"
          size="sm"
          :class="cn(
            'h-8 gap-1.5 px-2.5 text-xs transition-colors',
            engine.soundEnabled.value ? 'text-amber-400 hover:text-amber-300' : 'text-zinc-400 hover:text-zinc-200'
          )"
          :aria-label="engine.soundEnabled.value ? 'Mute sound' : 'Enable sound'"
          @click="engine.toggleSound"
        >
          <component :is="engine.soundEnabled.value ? Volume2 : VolumeX" class="size-3.5" />
          <span class="text-xs">{{ engine.soundEnabled.value ? 'Sound On' : 'Sound Off' }}</span>
        </Button>

        <ShortcutsModal />
      </div>
    </header>

    <!-- Algorithm Selector & Input Shape Presets -->
    <Card class="overflow-hidden">
      <!-- Tabs -->
      <TabsRoot v-model="algorithmModel" class="w-full">
        <div class="border-b border-zinc-800/80 px-3.5 py-2.5 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between bg-zinc-950/40">
          <div class="flex items-center gap-2">
            <span class="font-mono text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Algorithms
            </span>
          </div>

          <!-- Array Distribution Presets -->
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="font-mono text-[10px] uppercase tracking-wider text-zinc-500 mr-1 hidden lg:inline">
              Input Shape:
            </span>
            <button
              v-for="dist in DISTRIBUTION_LIST"
              :key="dist.id"
              type="button"
              :class="cn(
                'rounded-md px-2.5 py-1 font-mono text-[11px] font-medium transition-all cursor-pointer',
                distributionModel === dist.id
                  ? 'bg-zinc-800 text-amber-400 border border-zinc-700 shadow-xs'
                  : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-300 border border-transparent'
              )"
              :title="dist.description"
              @click="distributionModel = dist.id"
            >
              {{ dist.label }}
            </button>
          </div>
        </div>

        <TabsList class="flex w-full overflow-x-auto p-1.5 gap-1 scrollbar-none bg-zinc-950/20">
          <TabsTrigger
            v-for="algo in ALGORITHM_LIST"
            :key="algo.id"
            :value="algo.id"
            :class="cn(
              'flex-1 min-w-[130px] flex items-center justify-between gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all cursor-pointer',
              'text-zinc-400 outline-none hover:bg-zinc-800/60 hover:text-zinc-200',
              'data-[state=active]:border data-[state=active]:border-zinc-700/80 data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100 data-[state=active]:shadow-xs'
            )"
          >
            <span class="font-medium truncate">{{ algo.label }}</span>
            <span class="rounded px-1.5 py-0.5 font-mono text-[10px] bg-zinc-900 border border-zinc-800/80 text-zinc-400">
              {{ algo.complexity.timeAverage }}
            </span>
          </TabsTrigger>
        </TabsList>
      </TabsRoot>
    </Card>

    <!-- Telemetry Cards -->
    <section class="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Sorting Telemetry">
      <StatCard
        label="Comparisons"
        :value="engine.telemetry.value.comparisons.toLocaleString()"
        :icon="Eye"
        hint="Key comparisons executed"
      />
      <StatCard
        label="Writes / Swaps"
        :value="engine.telemetry.value.writes.toLocaleString()"
        :icon="ArrowLeftRight"
        hint="In-place array mutations"
      />
      <StatCard
        label="Accesses"
        :value="engine.telemetry.value.accesses.toLocaleString()"
        :icon="Activity"
        hint="Total index reads & writes"
      />
      <StatCard
        label="Elapsed Time"
        :value="elapsedDisplay"
        :icon="Clock"
        hint="Active execution duration"
      />
    </section>

    <!-- Visualizer Canvas -->
    <Card class="overflow-hidden">
      <!-- Canvas Header & Live Step Indicator -->
      <div class="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/80 bg-zinc-950/40 px-3.5 py-2.5">
        <div class="flex items-center gap-2">
          <span class="font-mono text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Array Canvas
          </span>
          <Badge variant="outline" class="text-[10px]">
            {{ engine.arraySize.value }} bars
          </Badge>
        </div>

        <!-- Live Step Hint -->
        <div class="flex items-center gap-2 font-mono text-xs text-zinc-400 truncate max-w-full sm:max-w-md">
          <span class="size-1.5 rounded-full bg-amber-500 shrink-0" />
          <span class="truncate">{{ engine.statusMessage.value }}</span>
        </div>
      </div>

      <CardContent class="p-3.5 sm:p-4">
        <!-- Visualizer Bar Area -->
        <div
          role="region"
          aria-label="Sorting Visualization Canvas"
          class="relative flex h-[280px] sm:h-[340px] items-end gap-px overflow-hidden rounded-lg border border-zinc-800/80 bg-zinc-950 p-2.5"
        >
          <div
            v-for="bar in engine.bars.value"
            :key="bar.id"
            :class="[
              'flex-1 rounded-t-[2px] transition-colors duration-75 relative flex justify-center',
              barStateClass(bar.state),
            ]"
            :style="{ height: `${Math.max(bar.heightPct, 3)}%` }"
          >
            <!-- Optional value labels for small array sizes -->
            <span
              v-if="engine.arraySize.value <= 26"
              class="absolute -top-5 font-mono text-[9px] font-medium text-zinc-400 select-none"
            >
              {{ bar.value }}
            </span>
          </div>

          <div
            v-if="engine.bars.value.length === 0"
            class="absolute inset-0 flex items-center justify-center font-mono text-xs text-zinc-500"
          >
            Generating array…
          </div>
        </div>

        <!-- Live Screen Reader Announcement -->
        <div class="sr-only" aria-live="polite">
          {{ engine.statusMessage.value }}
        </div>

        <!-- Legend Chips -->
        <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-zinc-800/50 pt-3">
          <span class="flex items-center gap-1.5 font-mono text-[11px] text-zinc-400">
            <span class="size-2 rounded-full bar-default" /> Unsorted
          </span>
          <span class="flex items-center gap-1.5 font-mono text-[11px] text-zinc-400">
            <span class="size-2 rounded-full bar-comparing" /> Comparing
          </span>
          <span class="flex items-center gap-1.5 font-mono text-[11px] text-zinc-400">
            <span class="size-2 rounded-full bar-swapping" /> Swapping
          </span>
          <span class="flex items-center gap-1.5 font-mono text-[11px] text-zinc-400">
            <span class="size-2 rounded-full bar-overwriting" /> Overwriting
          </span>
          <span class="flex items-center gap-1.5 font-mono text-[11px] text-zinc-400">
            <span class="size-2 rounded-full bar-sorted" /> Sorted
          </span>
        </div>
      </CardContent>
    </Card>

    <!-- Control Dock -->
    <Card>
      <div class="border-b border-zinc-800/80 bg-zinc-950/40 px-3.5 py-2">
        <span class="font-mono text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          Playback & Parameters
        </span>
      </div>
      <CardContent class="flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
        <!-- Sliders -->
        <div class="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 lg:gap-6">
          <div class="flex min-w-0 flex-1 flex-col gap-1.5">
            <div class="flex items-center justify-between">
              <label for="array-size-slider" class="font-mono text-[11px] uppercase tracking-wider text-zinc-400">
                Array Size
              </label>
              <span class="font-mono text-xs font-semibold text-zinc-200">
                {{ engine.arraySize.value }} <span class="text-zinc-500 font-normal">items</span>
              </span>
            </div>
            <Slider
              id="array-size-slider"
              v-model="sizeModel"
              :min="8"
              :max="160"
              :step="1"
              aria-label="Array Size Slider"
            />
          </div>

          <div class="flex min-w-0 flex-1 flex-col gap-1.5">
            <div class="flex items-center justify-between">
              <label for="speed-slider" class="font-mono text-[11px] uppercase tracking-wider text-zinc-400">
                Speed
              </label>
              <span class="font-mono text-xs font-semibold text-amber-400">
                {{ engine.speed.value }}×
              </span>
            </div>
            <Slider
              id="speed-slider"
              v-model="speedModel"
              :min="1"
              :max="100"
              :step="1"
              aria-label="Animation Speed Slider"
            />
          </div>
        </div>

        <!-- Action Button Group -->
        <div class="flex flex-wrap items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-zinc-800/60">
          <Button
            variant="default"
            size="lg"
            class="min-w-[120px] flex-1 lg:flex-none font-semibold"
            aria-label="Play or Pause Sorting"
            @click="handlePauseToggle"
          >
            <component :is="playIcon" class="size-4 fill-current" />
            {{ playLabel }}
            <kbd class="hidden sm:inline-block ml-1 rounded bg-black/20 px-1.5 py-0.2 font-mono text-[10px]">
              Space
            </kbd>
          </Button>

          <Button
            variant="secondary"
            size="lg"
            :disabled="isRunning"
            aria-label="Step forward one iteration"
            title="Step Forward (Right Arrow)"
            @click="handleStep"
          >
            <StepForward class="size-4" />
            Step
          </Button>

          <Button
            variant="outline"
            size="lg"
            aria-label="Shuffle and regenerate array"
            title="Shuffle / Reset (R)"
            @click="handleShuffle"
          >
            <Shuffle class="size-4" />
            Shuffle
          </Button>

          <Button
            variant="ghost"
            size="icon"
            class="h-10 w-10 text-zinc-400 hover:text-zinc-200"
            aria-label="Reset Array"
            title="Reset Array"
            @click="handleShuffle"
          >
            <RotateCcw class="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>

    <!-- Educational Algorithm Intuition Card -->
    <AlgorithmInfoCard :algorithm="engine.algorithmMeta.value" />
  </main>
</template>
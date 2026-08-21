<script setup lang="ts">
import { computed, onBeforeUnmount } from 'vue'
import { TabsList, TabsRoot, TabsTrigger } from 'radix-vue'
import { Pause, Play, RotateCcw, Shuffle, StepForward } from '@lucide/vue'
import { useSortingEngine } from '@/composables/useSortingEngine'
import { ALGORITHM_LIST } from '@/lib/algorithms'
import type { BarState, SortingAlgorithmKey } from '@/lib/types'
import { cn } from '@/lib/utils'

import Button from '@/components/ui/button/Button.vue'
import Badge from '@/components/ui/badge/Badge.vue'
import { Card, CardContent } from '@/components/ui/card'
import Slider from '@/components/ui/slider/Slider.vue'
import StatCard from '@/components/StatCard.vue'

const engine = useSortingEngine()

const algorithmModel = computed<SortingAlgorithmKey>({
  get: () => engine.algorithm.value,
  set: (key) => engine.selectAlgorithm(key),
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
  set: (next) => engine.setArraySize(next[0] ?? 50),
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
      return 'bar-comparing'
    case 'swapping':
      return 'bar-swapping'
    case 'overwriting':
      return 'bar-overwriting'
    case 'sorted':
      return 'bar-sorted'
    default:
      return 'bar-default'
  }
}

/** Status dot color for the run-state readout. */
function statusDotClass(): string {
  if (isComplete.value) return 'bg-emerald-500'
  if (isRunning.value) return 'bg-amber-500'
  if (isPaused.value) return 'bg-zinc-300'
  return 'bg-zinc-700'
}

function statusLabel(): string {
  if (isComplete.value) return 'Complete'
  if (isRunning.value) return 'Sorting'
  if (isPaused.value) return 'Paused'
  return 'Idle'
}

onBeforeUnmount(() => engine.dispose())
</script>

<template>
  <div class="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8">
    <!-- Header -->
    <header class="flex items-end justify-between gap-4">
      <div>
        <h1 class="text-lg font-semibold tracking-tight text-zinc-100">Sort Pulse</h1>
        <p class="font-mono text-xs text-zinc-500">real-time sorting algorithm visualizer</p>
      </div>
      <div class="hidden items-center gap-2 sm:flex">
        <Badge>
          {{ engine.arraySize.value }} elements
        </Badge>
        <Badge>
          {{ engine.algorithmMeta.value.label }}
        </Badge>
      </div>
    </header>

    <!-- Algorithm selector -->
    <Card>
      <div class="border-b border-zinc-800 px-3 pt-3">
        <p class="font-mono text-[10px] uppercase tracking-wider text-zinc-500">Algorithm</p>
      </div>
      <TabsRoot v-model="algorithmModel" class="w-full">
        <TabsList
          class="inline-flex w-full flex-wrap items-center gap-1 p-1.5"
        >
          <TabsTrigger
            v-for="algo in ALGORITHM_LIST"
            :key="algo.id"
            :value="algo.id"
            :class="cn(
              'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
              'text-zinc-400 outline-none hover:bg-zinc-800 hover:text-zinc-200',
              'data-[state=active]:border data-[state=active]:border-zinc-600 data-[state=active]:bg-zinc-800',
              'data-[state=active]:text-zinc-100',
            )"
          >
            {{ algo.label }}
            <span
              class="rounded-sm border border-zinc-800 bg-zinc-900 px-1 py-px font-mono text-[10px] text-zinc-500"
            >
              {{ algo.complexity.timeAverage }}
            </span>
          </TabsTrigger>
        </TabsList>

        <div class="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-zinc-800 px-3 py-2.5">
          <span class="font-mono text-[10px] uppercase tracking-wider text-zinc-500">Details</span>
          <span class="text-xs font-medium text-zinc-300">{{ engine.algorithmMeta.value.label }}</span>
          <span class="hidden text-xs text-zinc-500 md:inline">{{ engine.algorithmMeta.value.description }}</span>
          <span class="ml-auto flex flex-wrap items-center gap-1.5">
            <span class="font-mono text-[10px] text-zinc-500">Best</span>
            <Badge>{{ engine.algorithmMeta.value.complexity.timeBest }}</Badge>
            <span class="font-mono text-[10px] text-zinc-500">Avg</span>
            <Badge>{{ engine.algorithmMeta.value.complexity.timeAverage }}</Badge>
            <span class="font-mono text-[10px] text-zinc-500">Worst</span>
            <Badge>{{ engine.algorithmMeta.value.complexity.timeWorst }}</Badge>
            <span class="font-mono text-[10px] text-zinc-500">Space</span>
            <Badge>{{ engine.algorithmMeta.value.complexity.space }}</Badge>
            <span class="font-mono text-[10px] text-zinc-500">Stable</span>
            <Badge
              :class="engine.algorithmMeta.value.stable ? 'border-emerald-900 text-emerald-400' : 'border-red-900 text-red-400'"
            >
              {{ engine.algorithmMeta.value.stable ? 'Yes' : 'No' }}
            </Badge>
          </span>
        </div>
      </TabsRoot>
    </Card>

    <!-- Telemetry readout -->
    <section class="grid grid-cols-2 gap-2 lg:grid-cols-4">
      <StatCard label="Comparisons" :value="engine.telemetry.value.comparisons.toLocaleString()" />
      <StatCard label="Writes" :value="engine.telemetry.value.writes.toLocaleString()" />
      <StatCard label="Accesses" :value="engine.telemetry.value.accesses.toLocaleString()" />
      <StatCard label="Elapsed" :value="elapsedDisplay" />
    </section>

    <!-- Visualizer canvas -->
    <Card>
      <div class="flex items-center justify-between border-b border-zinc-800 px-3 py-2">
        <p class="font-mono text-[10px] uppercase tracking-wider text-zinc-500">Visualizer</p>
        <span class="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
          <span class="size-1.5" :class="statusDotClass()" />
          {{ statusLabel() }}
        </span>
      </div>

      <CardContent class="p-3">
        <div
          class="relative flex h-[320px] items-end gap-px overflow-hidden rounded-md border border-zinc-800 bg-zinc-950 p-2"
        >
          <div
            v-for="bar in engine.bars.value"
            :key="bar.id"
            :class="['flex-1 transition-colors duration-100', barStateClass(bar.state)]"
            :style="{ height: `${bar.heightPct}%` }"
          />
          <div
            v-if="engine.bars.value.length === 0"
            class="absolute inset-0 flex items-center justify-center font-mono text-xs text-zinc-600"
          >
            Generating array…
          </div>
        </div>

        <!-- Legend -->
        <div class="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span class="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
            <i class="size-2 bar-default" />Unsorted
          </span>
          <span class="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
            <i class="size-2 bar-comparing" />Comparing
          </span>
          <span class="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
            <i class="size-2 bar-swapping" />Swapping
          </span>
          <span class="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
            <i class="size-2 bar-overwriting" />Overwriting
          </span>
          <span class="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
            <i class="size-2 bar-sorted" />Sorted
          </span>
        </div>
      </CardContent>
    </Card>

    <!-- Control dock -->
    <Card>
      <div class="border-b border-zinc-800 px-3 pt-3">
        <p class="font-mono text-[10px] uppercase tracking-wider text-zinc-500">Controls</p>
      </div>
      <CardContent class="flex flex-col gap-4 p-3 lg:flex-row lg:items-center">
        <div class="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:gap-6">
          <div class="flex min-w-0 flex-1 flex-col gap-2">
            <label class="flex items-baseline justify-between">
              <span class="font-mono text-[10px] uppercase tracking-wider text-zinc-500">Array Size</span>
              <span class="font-mono text-xs font-medium text-zinc-300">{{ engine.arraySize.value }}</span>
            </label>
            <Slider v-model="sizeModel" :min="10" :max="200" :step="1" />
          </div>

          <div class="flex min-w-0 flex-1 flex-col gap-2">
            <label class="flex items-baseline justify-between">
              <span class="font-mono text-[10px] uppercase tracking-wider text-zinc-500">Speed</span>
              <span class="font-mono text-xs font-medium text-zinc-300">{{ engine.speed.value }}×</span>
            </label>
            <Slider v-model="speedModel" :min="1" :max="100" :step="1" />
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <Button
            variant="default"
            size="lg"
            class="min-w-[110px] flex-1 lg:flex-none"
            @click="handlePauseToggle"
          >
            <component :is="playIcon" class="size-4" />
            {{ playLabel }}
          </Button>

          <Button variant="secondary" size="lg" :disabled="isRunning" @click="handleStep">
            <StepForward class="size-4" />
            Step
          </Button>

          <Button variant="outline" size="lg" @click="handleShuffle">
            <Shuffle class="size-4" />
            Shuffle
          </Button>

          <Button variant="ghost" size="icon" title="Reset" @click="handleShuffle">
            <RotateCcw class="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount } from 'vue'
import { TabsList, TabsRoot, TabsTrigger } from 'radix-vue'
import {
  Activity,
  BarChart3,
  Cpu,
  Pause,
  Play,
  RotateCcw,
  Shuffle,
  StepForward,
  Timer,
  Zap,
} from '@lucide/vue'
import { useSortingEngine } from '@/composables/useSortingEngine'
import { ALGORITHM_LIST } from '@/lib/algorithms'
import type { BarState, SortingAlgorithmKey } from '@/lib/types'
import { cn } from '@/lib/utils'

import Button from '@/components/ui/button/Button.vue'
import Badge from '@/components/ui/badge/Badge.vue'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
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

onBeforeUnmount(() => engine.dispose())
</script>

<template>
  <div class="relative mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-8">
    <!-- Header -->
    <header class="flex items-center gap-3">
      <div
        class="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/40"
      >
        <BarChart3 class="size-5 text-primary-foreground" />
      </div>
      <div>
        <h1 class="text-2xl font-bold tracking-tight">Sort Pulse</h1>
        <p class="text-sm text-muted-foreground">Real-time sorting algorithm visualizer</p>
      </div>
      <Badge
        class="ml-auto hidden items-center gap-1 border-primary/40 bg-primary/10 text-primary sm:inline-flex"
      >
        <Zap class="size-3" />
        {{ engine.arraySize.value }} elements
      </Badge>
    </header>

    <!-- Algorithm selector -->
    <Card>
      <TabsRoot v-model="algorithmModel" class="w-full">
        <TabsList
          class="inline-flex w-full flex-wrap items-center justify-center gap-1 rounded-xl bg-muted/40 p-1"
        >
          <TabsTrigger
            v-for="algo in ALGORITHM_LIST"
            :key="algo.id"
            :value="algo.id"
            :class="cn(
              'inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
              'text-muted-foreground outline-none hover:text-foreground hover:bg-secondary/60',
              'data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-accent',
              'data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:shadow-primary/30',
            )"
          >
            {{ algo.label }}
            <span
              class="rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold text-white/75"
            >
              {{ algo.complexity.timeAverage }}
            </span>
          </TabsTrigger>
        </TabsList>

        <div class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border/60 px-3 pt-3 pb-1 text-sm">
          <span class="font-semibold text-foreground">
            {{ engine.algorithmMeta.value.label }}
          </span>
          <span class="text-muted-foreground italic">
            {{ engine.algorithmMeta.value.description }}
          </span>
          <span class="ml-auto flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            Best
            <Badge class="bg-secondary/60 font-mono">{{ engine.algorithmMeta.value.complexity.timeBest }}</Badge>
            Avg
            <Badge class="bg-secondary/60 font-mono">{{ engine.algorithmMeta.value.complexity.timeAverage }}</Badge>
            Worst
            <Badge class="bg-secondary/60 font-mono">{{ engine.algorithmMeta.value.complexity.timeWorst }}</Badge>
            Space
            <Badge class="bg-secondary/60 font-mono">{{ engine.algorithmMeta.value.complexity.space }}</Badge>
            ·
            Stable
            <span
              :class="engine.algorithmMeta.value.stable ? 'font-semibold text-emerald-400' : 'font-semibold text-rose-400'"
            >
              {{ engine.algorithmMeta.value.stable ? 'Yes' : 'No' }}
            </span>
          </span>
        </div>
      </TabsRoot>
    </Card>

    <!-- Telemetry dashboard -->
    <section class="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard label="Comparisons" :value="engine.telemetry.value.comparisons.toLocaleString()" :icon="Activity" />
      <StatCard label="Writes" :value="engine.telemetry.value.writes.toLocaleString()" :icon="Cpu" />
      <StatCard label="Accesses" :value="engine.telemetry.value.accesses.toLocaleString()" :icon="Zap" />
      <StatCard label="Elapsed" :value="elapsedDisplay" :icon="Timer" />
    </section>

    <!-- Visualizer canvas -->
    <Card>
      <div class="border-b border-border/60 p-4 pb-3">
        <CardHeader class="p-0">
          <CardTitle class="flex items-center justify-between text-sm font-medium text-muted-foreground">
            <span class="flex items-center gap-2">
              <Activity class="size-4 text-primary" />
              Visualizer
            </span>
            <span
              class="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
              :class="{
                'bg-emerald-500/15 text-emerald-400': isComplete,
                'bg-amber-500/15 text-amber-400': isRunning,
                'bg-sky-500/15 text-sky-400': isPaused,
                'bg-muted text-muted-foreground': !isRunning && !isPaused && !isComplete,
              }"
            >
              <span
                class="size-1.5 rounded-full"
                :class="{
                  'bg-emerald-400': isComplete,
                  'bg-amber-400 animate-pulse': isRunning,
                  'bg-sky-400': isPaused,
                  'bg-muted': !isRunning && !isPaused && !isComplete,
                }"
              />
              {{ isComplete ? 'Sort complete' : isRunning ? 'Sorting' : isPaused ? 'Paused' : 'Idle' }}
            </span>
          </CardTitle>
        </CardHeader>
      </div>

      <CardContent class="p-4">
        <div
          class="relative flex h-[320px] items-end gap-[2px] overflow-hidden rounded-xl border border-border/60 bg-gradient-to-b from-secondary/30 to-muted/20 p-3 sm:gap-1"
        >
          <div
            v-for="bar in engine.bars.value"
            :key="bar.id"
            :class="['flex-1 rounded-t-[3px] transition-all duration-100', barStateClass(bar.state)]"
            :style="{ height: `${bar.heightPct}%` }"
          />
          <div
            v-if="engine.bars.value.length === 0"
            class="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground"
          >
            Generating array…
          </div>
        </div>

        <!-- Legend -->
        <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span class="flex items-center gap-1.5"><i class="size-2.5 rounded-sm bar-default" />Unsorted</span>
          <span class="flex items-center gap-1.5"><i class="size-2.5 rounded-sm bar-comparing" />Comparing</span>
          <span class="flex items-center gap-1.5"><i class="size-2.5 rounded-sm bar-swapping" />Swapping</span>
          <span class="flex items-center gap-1.5"><i class="size-2.5 rounded-sm bar-overwriting" />Overwriting</span>
          <span class="flex items-center gap-1.5"><i class="size-2.5 rounded-sm bar-sorted" />Sorted</span>
        </div>
      </CardContent>
    </Card>

    <!-- Control dock -->
    <Card>
      <CardContent class="flex flex-col gap-4 p-4 lg:flex-row lg:items-center">
        <div class="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 lg:flex lg:gap-6">
          <div class="flex min-w-0 flex-1 flex-col gap-1.5">
            <label class="flex items-center justify-between text-xs text-muted-foreground">
              Array Size
              <span class="font-mono font-semibold text-foreground">{{ engine.arraySize.value }}</span>
            </label>
            <Slider v-model="sizeModel" :min="10" :max="200" :step="1" />
          </div>

          <div class="flex min-w-0 flex-1 flex-col gap-1.5">
            <label class="flex items-center justify-between text-xs text-muted-foreground">
              Speed
              <span class="font-mono font-semibold text-foreground">{{ engine.speed.value }}×</span>
            </label>
            <Slider v-model="speedModel" :min="1" :max="100" :step="1" />
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <Button
            variant="gradient"
            size="lg"
            class="min-w-[120px] flex-1 lg:flex-none"
            @click="handlePauseToggle"
          >
            <component :is="playIcon" class="size-4" />
            {{ playLabel }}
          </Button>

          <Button
            variant="secondary"
            size="lg"
            :disabled="isRunning"
            @click="handleStep"
          >
            <StepForward class="size-4" />
            Step
          </Button>

          <Button variant="outline" size="lg" @click="handleShuffle">
            <Shuffle class="size-4" />
            Shuffle
          </Button>

          <Button variant="ghost" size="lg" @click="engine.selectAlgorithm(engine.algorithm.value)">
            <RotateCcw class="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
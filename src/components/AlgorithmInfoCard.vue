<script setup lang="ts">
import { computed } from 'vue'
import { CheckCircle2, Clock, Cpu, Info, Sparkles, XCircle } from '@lucide/vue'
import Badge from '@/components/ui/badge/Badge.vue'
import type { AlgorithmMeta } from '@/lib/types'

const props = defineProps<{
  algorithm: AlgorithmMeta
}>()

const isFastAverage = computed(() => {
  return props.algorithm.complexity.timeAverage.includes('log')
})
</script>

<template>
  <div class="flex flex-col gap-3 rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4 transition-all">
    <!-- Top row: Paradigm + Label + Stability -->
    <div class="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800/60 pb-3">
      <div class="flex items-center gap-2">
        <div class="flex size-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
          <Cpu class="size-4" />
        </div>
        <div>
          <h3 class="font-sans text-sm font-semibold text-zinc-100 leading-none">
            {{ algorithm.label }}
          </h3>
          <p class="mt-0.5 font-mono text-[11px] text-zinc-400">
            {{ algorithm.paradigm }}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-1.5">
        <Badge :variant="algorithm.stable ? 'success' : 'outline'">
          <component :is="algorithm.stable ? CheckCircle2 : XCircle" class="size-3" />
          {{ algorithm.stable ? 'Stable' : 'Not Stable' }}
        </Badge>
        <Badge variant="secondary">
          Space: {{ algorithm.complexity.space }}
        </Badge>
      </div>
    </div>

    <!-- Description & Best For -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
      <div class="flex flex-col gap-1 text-zinc-300">
        <span class="font-mono text-[10px] uppercase tracking-wider text-zinc-500 flex items-center gap-1">
          <Info class="size-3" /> Mechanism
        </span>
        <p class="leading-relaxed text-zinc-400">
          {{ algorithm.description }}
        </p>
      </div>

      <div class="flex flex-col gap-1 text-zinc-300">
        <span class="font-mono text-[10px] uppercase tracking-wider text-zinc-500 flex items-center gap-1">
          <Sparkles class="size-3 text-amber-500" /> Best Used For
        </span>
        <p class="leading-relaxed text-zinc-400">
          {{ algorithm.bestFor }}
        </p>
      </div>
    </div>

    <!-- Complexity chips -->
    <div class="mt-1 flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-800/50">
      <span class="font-mono text-[10px] uppercase tracking-wider text-zinc-500 flex items-center gap-1">
        <Clock class="size-3" /> Time:
      </span>
      <div class="flex flex-wrap items-center gap-1.5 font-mono text-xs">
        <span class="text-zinc-500 text-[11px]">Best:</span>
        <Badge variant="amber">{{ algorithm.complexity.timeBest }}</Badge>

        <span class="text-zinc-500 text-[11px] ml-1">Avg:</span>
        <Badge :variant="isFastAverage ? 'success' : 'secondary'">{{ algorithm.complexity.timeAverage }}</Badge>

        <span class="text-zinc-500 text-[11px] ml-1">Worst:</span>
        <Badge :variant="algorithm.complexity.timeWorst.includes('n²') ? 'destructive' : 'secondary'">
          {{ algorithm.complexity.timeWorst }}
        </Badge>
      </div>
    </div>
  </div>
</template>

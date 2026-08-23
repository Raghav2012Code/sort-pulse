<script setup lang="ts">
import type { Component, HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

interface Props {
  label: string
  value: string | number
  unit?: string
  hint?: string
  icon?: Component
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()
</script>

<template>
  <div
    :class="cn(
      'group relative flex flex-col justify-between rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-3.5 transition-colors hover:border-zinc-700/80',
      props.class,
    )"
  >
    <div class="flex items-center justify-between gap-2">
      <span class="font-mono text-[11px] font-medium uppercase tracking-wider text-zinc-400">
        {{ label }}
      </span>
      <component
        :is="icon"
        v-if="icon"
        class="size-3.5 text-zinc-500 transition-colors group-hover:text-zinc-300"
      />
    </div>

    <div class="mt-2 flex items-baseline gap-1.5">
      <span class="font-mono text-xl sm:text-2xl font-semibold tabular-nums tracking-tight text-zinc-100">
        {{ value }}
      </span>
      <span v-if="unit" class="font-mono text-xs text-zinc-500">
        {{ unit }}
      </span>
    </div>

    <p v-if="hint" class="mt-1 text-[11px] text-zinc-500 truncate">
      {{ hint }}
    </p>

    <slot />
  </div>
</template>
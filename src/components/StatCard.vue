<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

interface Props {
  label: string
  value: string
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()
</script>

<template>
  <div
    :class="cn(
      'flex flex-col gap-1 rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-2.5',
      props.class,
    )"
  >
    <span class="font-mono text-[10px] font-medium uppercase tracking-wider text-zinc-500">
      {{ label }}
    </span>
    <span class="font-mono text-lg font-medium tabular-nums leading-none text-zinc-100">
      {{ value }}
    </span>
    <slot />
  </div>
</template>
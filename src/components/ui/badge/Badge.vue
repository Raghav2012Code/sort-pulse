<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <span
    :class="cn(
      'inline-flex items-center gap-1 rounded-sm border border-zinc-800 bg-zinc-900 px-1.5 py-0.5',
      'font-mono text-[11px] font-medium leading-none text-zinc-400',
      props.class,
    )"
  >
    <slot />
  </span>
</template>
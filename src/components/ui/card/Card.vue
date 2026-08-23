<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <div
    :class="cn(
      'rounded-xl border border-zinc-800/80 bg-zinc-900/40 text-zinc-100 shadow-sm',
      props.class,
    )"
  >
    <slot />
  </div>
</template>
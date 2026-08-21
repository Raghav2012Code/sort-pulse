<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <div
    :class="cn(
      'rounded-md border border-zinc-800 bg-zinc-900/60 text-zinc-100',
      props.class,
    )"
  >
    <slot />
  </div>
</template>
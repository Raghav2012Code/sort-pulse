<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <div
    :class="cn(
      'rounded-2xl border border-border/80 bg-card/70 text-card-foreground backdrop-blur-xl',
      'shadow-[0_8px_40px_-12px_rgba(0,0,0,0.6)]',
      props.class,
    )"
  >
    <slot />
  </div>
</template>
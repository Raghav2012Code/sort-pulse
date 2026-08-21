<script setup lang="ts">
import type { Component, HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'

interface Props {
  label: string
  value: string
  hint?: string
  icon?: Component
  iconClass?: string
  class?: HTMLAttributes['class']
}

const props = defineProps<Props>()
</script>

<template>
  <div
    :class="cn(
      'relative overflow-hidden rounded-xl border border-border/70 bg-secondary/40 p-3',
      'backdrop-blur transition-colors',
      props.class,
    )"
  >
    <div class="flex items-center justify-between">
      <span class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {{ label }}
      </span>
      <component :is="icon" v-if="icon" :class="cn('size-4 text-primary', iconClass)" />
    </div>
    <div class="mt-1 flex items-baseline gap-1">
      <span class="font-mono text-xl font-bold tabular-nums text-foreground">{{ value }}</span>
      <span v-if="hint" class="text-xs text-muted-foreground">{{ hint }}</span>
    </div>
    <slot />
  </div>
</template>
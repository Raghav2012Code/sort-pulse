<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[11px] font-medium transition-colors select-none',
  {
    variants: {
      variant: {
        default: 'border border-zinc-800 bg-zinc-900/90 text-zinc-300',
        secondary: 'border border-zinc-700/60 bg-zinc-800 text-zinc-200',
        outline: 'border border-zinc-700 bg-transparent text-zinc-400',
        amber: 'border border-amber-500/20 bg-amber-500/10 text-amber-300',
        success: 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
        destructive: 'border border-rose-500/20 bg-rose-500/10 text-rose-400',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

type BadgeVariants = VariantProps<typeof badgeVariants>

interface Props {
  variant?: BadgeVariants['variant']
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
})
</script>

<template>
  <span :class="cn(badgeVariants({ variant }), props.class)">
    <slot />
  </span>
</template>
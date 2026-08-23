<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { Primitive, type PrimitiveProps } from 'radix-vue'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-xs sm:text-sm font-medium',
    'border border-transparent transition-all duration-150 ease-out cursor-pointer select-none',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950',
    'disabled:pointer-events-none disabled:opacity-40',
    'active:scale-[0.98]',
    '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        default: 'bg-amber-500 text-zinc-950 font-semibold hover:bg-amber-400 shadow-sm shadow-amber-500/10',
        secondary: 'border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:border-zinc-700',
        outline: 'border-zinc-800 bg-transparent text-zinc-300 hover:bg-zinc-800/80 hover:text-zinc-100 hover:border-zinc-700',
        ghost: 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-100',
        destructive: 'bg-rose-600 text-white hover:bg-rose-500 shadow-sm shadow-rose-600/10',
      },
      size: {
        default: 'h-9 px-3.5 py-1.5',
        sm: 'h-8 px-2.5 text-xs',
        lg: 'h-10 px-4 text-sm',
        icon: 'h-9 w-9 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

type ButtonVariants = VariantProps<typeof buttonVariants>

interface Props extends PrimitiveProps {
  variant?: ButtonVariants['variant']
  size?: ButtonVariants['size']
  class?: HTMLAttributes['class']
  type?: 'button' | 'submit' | 'reset'
}

const props = withDefaults(defineProps<Props>(), {
  as: 'button',
  variant: 'default',
  size: 'default',
  type: 'button',
})
</script>

<template>
  <Primitive
    :as="as"
    :as-child="asChild"
    :type="as === 'button' ? type : undefined"
    :class="cn(buttonVariants({ variant, size }), props.class)"
    v-bind="$attrs"
  >
    <slot />
  </Primitive>
</template>
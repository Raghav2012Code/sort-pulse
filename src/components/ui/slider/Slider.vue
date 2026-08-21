<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import {
  SliderRange,
  SliderRoot,
  SliderThumb,
  SliderTrack,
  type SliderRootProps,
} from 'radix-vue'
import { cn } from '@/lib/utils'

const props = withDefaults(defineProps<SliderRootProps & { class?: HTMLAttributes['class'] }>(), {
  orientation: 'horizontal',
})

const model = defineModel<number[]>('modelValue', { required: true })
</script>

<template>
  <SliderRoot
    v-model:model-value="model"
    :class="cn(
      'relative flex w-full touch-none select-none items-center',
      props.orientation === 'vertical' ? 'flex-col' : 'h-5',
      props.class,
    )"
    :orientation="orientation"
    v-bind="$attrs"
  >
    <SliderTrack
      :class="cn(
        'relative grow overflow-hidden rounded-full bg-muted/70',
        orientation === 'vertical' ? 'h-full w-1.5' : 'h-1.5 w-full',
      )"
    >
      <SliderRange
        :class="cn(
          'absolute rounded-full bg-gradient-to-r from-primary to-accent shadow-[0_0_10px] shadow-primary/50',
          orientation === 'vertical' ? 'w-full' : 'h-full',
        )"
      />
    </SliderTrack>

    <template v-for="(_, index) in model" :key="index">
      <SliderThumb
        :class="cn(
          'block h-4 w-4 rounded-full border-2 border-primary bg-background shadow-lg shadow-primary/30',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          'hover:scale-110 transition-transform',
        )"
      />
    </template>
  </SliderRoot>
</template>
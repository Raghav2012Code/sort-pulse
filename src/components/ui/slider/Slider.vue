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
      'relative flex w-full touch-none select-none items-center py-2 cursor-pointer',
      props.orientation === 'vertical' ? 'flex-col h-full' : 'h-5',
      props.class,
    )"
    :orientation="orientation"
    v-bind="$attrs"
  >
    <SliderTrack
      :class="cn(
        'relative grow overflow-hidden rounded-full bg-zinc-800 transition-colors',
        orientation === 'vertical' ? 'h-full w-1.5' : 'h-1.5 w-full',
      )"
    >
      <SliderRange
        :class="cn(
          'absolute rounded-full bg-amber-500',
          orientation === 'vertical' ? 'w-full' : 'h-full',
        )"
      />
    </SliderTrack>

    <template v-for="(_, index) in model" :key="index">
      <SliderThumb
        :class="cn(
          'block size-4 rounded-full border-2 border-amber-500 bg-zinc-950 shadow-sm',
          'transition-all duration-150 ease-out hover:scale-125 hover:border-amber-400',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950',
          'cursor-grab active:cursor-grabbing',
        )"
      />
    </template>
  </SliderRoot>
</template>
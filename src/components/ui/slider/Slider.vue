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
      props.orientation === 'vertical' ? 'flex-col' : 'h-4',
      props.class,
    )"
    :orientation="orientation"
    v-bind="$attrs"
  >
    <SliderTrack
      :class="cn(
        'relative grow overflow-hidden rounded-sm bg-zinc-800',
        orientation === 'vertical' ? 'h-full w-[2px]' : 'h-[2px] w-full',
      )"
    >
      <SliderRange
        :class="cn(
          'absolute rounded-sm bg-zinc-300',
          orientation === 'vertical' ? 'w-full' : 'h-full',
        )"
      />
    </SliderTrack>

    <template v-for="(_, index) in model" :key="index">
      <SliderThumb
        :class="cn(
          'block size-3 rounded-[3px] border border-zinc-500 bg-zinc-100',
          'transition-colors hover:border-zinc-300',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
        )"
      />
    </template>
  </SliderRoot>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from 'radix-vue'
import { Command, Keyboard, X } from '@lucide/vue'
import Button from '@/components/ui/button/Button.vue'

const open = ref(false)

const shortcuts = [
  { key: 'Space', description: 'Start / Pause animation' },
  { key: '→', description: 'Step forward one frame' },
  { key: 'R / S', description: 'Shuffle / Regenerate array' },
  { key: 'M', description: 'Toggle sound on / off' },
  { key: '1 - 6', description: 'Select algorithm (1: Bubble, 2: Insertion, etc.)' },
]
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogTrigger as-child>
      <Button
        variant="ghost"
        size="sm"
        class="h-8 gap-1.5 px-2.5 text-xs text-zinc-400 hover:text-zinc-200"
        aria-label="View keyboard shortcuts"
      >
        <Keyboard class="size-3.5" />
        <span class="hidden sm:inline">Shortcuts</span>
      </Button>
    </DialogTrigger>

    <DialogPortal>
      <DialogOverlay class="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs transition-opacity" />
      <DialogContent
        class="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl focus:outline-none"
      >
        <div class="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div class="flex items-center gap-2">
            <Command class="size-4 text-amber-500" />
            <DialogTitle class="font-sans text-sm font-semibold text-zinc-100">
              Keyboard Shortcuts
            </DialogTitle>
          </div>
          <DialogClose as-child>
            <button
              type="button"
              class="rounded-md p-1 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-colors focus:outline-none"
              aria-label="Close"
            >
              <X class="size-4" />
            </button>
          </DialogClose>
        </div>

        <DialogDescription class="mt-2 text-xs text-zinc-400">
          Control the sorting visualizer hands-free using your keyboard:
        </DialogDescription>

        <div class="mt-4 flex flex-col gap-2">
          <div
            v-for="item in shortcuts"
            :key="item.key"
            class="flex items-center justify-between rounded-lg border border-zinc-800/60 bg-zinc-950/50 px-3 py-2 text-xs"
          >
            <span class="text-zinc-300">{{ item.description }}</span>
            <kbd class="rounded-md border border-zinc-700 bg-zinc-800 px-2 py-0.5 font-mono text-[11px] font-medium text-zinc-200 shadow-xs">
              {{ item.key }}
            </kbd>
          </div>
        </div>

        <div class="mt-5 flex justify-end">
          <DialogClose as-child>
            <Button variant="secondary" size="sm">
              Close
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

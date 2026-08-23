<script setup lang="ts">
import SortingVisualizer from '@/components/SortingVisualizer.vue'
</script>

<template>
  <div class="min-h-screen bg-background text-foreground flex flex-col justify-between">
    <!-- Subtle top ambient header line -->
    <div class="h-0.5 w-full bg-linear-to-r from-transparent via-amber-500/40 to-transparent" />

    <div class="flex-1">
      <SortingVisualizer />
    </div>

    <!-- Minimalist, intentional footer -->
    <footer class="mt-8 border-t border-zinc-800/60 py-6 text-center text-xs text-zinc-400">
      <div class="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 sm:flex-row">
        <p class="font-mono text-[11px] text-zinc-400">
          Sort Pulse &bull; Interactive Algorithm Telemetry & Visualizer
        </p>
        <p class="font-mono text-[11px] text-zinc-400">
          Built with Vue 3 &bull; Radix &bull; Tailwind CSS
        </p>
      </div>
    </footer>
  </div>
</template>
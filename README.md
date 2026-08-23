# Sort Pulse — Interactive Sorting Visualizer & Telemetry

A high-craft, real-time sorting algorithm visualizer built with **Vue 3**, **TypeScript**, **Vite**, **Tailwind CSS**, **Radix Vue**, and **Lucide** icons.

## Features

- **6 Core Sorting Algorithms** — Bubble, Insertion, Selection, Merge, Quick, and Heap sort with complexity and paradigm breakdowns.
- **Generator-based Architecture** — Each algorithm is an ES6 generator (`function*`) yielding typed step payloads (`compare`, `swap`, `overwrite`, `sorted`).
- **Array Distribution Presets** — Test best and worst cases using Random, Reversed, Nearly Sorted, and Few Unique presets.
- **Dynamic Batching Engine** — High-speed execution batches steps smoothly without timer bottlenecking.
- **Live Sound Synthesis** — Web Audio API frequency synthesis mapped to array values ("Sound of Sorting").
- **Live Telemetry & Step Status** — Comparisons, Writes/Swaps, Array Accesses, Elapsed Duration, and real-time step descriptions.
- **Keyboard Shortcuts** — Full hands-free control (`Space` to play/pause, `→` to step, `R`/`S` to shuffle, `M` to toggle sound, `1-6` to switch algorithms).
- **Responsive & Accessible** — Semantic HTML, screen-reader live announcements, high contrast, and responsive layout across mobile and desktop.

## Project Structure

```
src/
├── components/
│   ├── SortingVisualizer.vue      # Main visualizer workspace
│   ├── AlgorithmInfoCard.vue      # Algorithm mechanism & complexity panel
│   ├── ShortcutsModal.vue         # Keyboard shortcuts dialog
│   ├── StatCard.vue               # Telemetry readout card
│   └── ui/                        # UI primitives (button, card, slider, badge)
├── composables/
│   └── useSortingEngine.ts        # Reactive sorting engine with dynamic batching
└── lib/
    ├── algorithms.ts              # Algorithm generators & distribution presets
    ├── audio.ts                   # Web Audio synthesizer
    ├── types.ts                   # Type contracts & telemetry models
    └── utils.ts                   # Tailwind utility merge helper
```

## Getting Started

```bash
npm install
npm run dev
```

## Build & Type Check

```bash
npm run build      # vue-tsc -b && vite build
npm run preview
```
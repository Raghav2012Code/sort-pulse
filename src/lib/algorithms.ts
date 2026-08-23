import type {
  AlgorithmMeta,
  ArrayDistributionKey,
  BarState,
  DistributionMeta,
  SortingAlgorithmKey,
  SortGenerator,
  SortStep,
  Telemetry,
} from '@/lib/types'

/**
 * Sorting algorithm generators & array distribution presets.
 *
 * Each generator receives a working copy of the array plus a telemetry object.
 * It yields `SortStep` frames that the engine replays onto the rendered bars;
 * the working array is mutated in place, so generators never touch the DOM.
 */

const scalar = Math.random

/** Generates an array based on the requested distribution preset. */
export function generateArray(
  n: number,
  distribution: ArrayDistributionKey = 'random',
  valueMax = 100,
): number[] {
  const arr = new Array<number>(n)
  const minVal = 5

  switch (distribution) {
    case 'reversed': {
      for (let i = 0; i < n; i++) {
        const pct = (n - 1 - i) / Math.max(n - 1, 1)
        arr[i] = Math.round(minVal + pct * (valueMax - minVal))
      }
      break
    }
    case 'nearlySorted': {
      // Linear ascending array
      for (let i = 0; i < n; i++) {
        const pct = i / Math.max(n - 1, 1)
        arr[i] = Math.round(minVal + pct * (valueMax - minVal))
      }
      // Swap ~8% of random pairs to introduce slight perturbations
      const perturbations = Math.max(1, Math.floor(n * 0.08))
      for (let k = 0; k < perturbations; k++) {
        const i = Math.floor(scalar() * n)
        const j = Math.max(0, Math.min(n - 1, i + Math.floor(scalar() * 5) - 2))
        if (i !== j) {
          const temp = arr[i]
          arr[i] = arr[j]
          arr[j] = temp
        }
      }
      break
    }
    case 'fewUnique': {
      // Pick from 4 fixed discrete bins
      const levels = [
        minVal + 0.15 * (valueMax - minVal),
        minVal + 0.4 * (valueMax - minVal),
        minVal + 0.7 * (valueMax - minVal),
        valueMax,
      ].map(Math.round)

      for (let i = 0; i < n; i++) {
        const levelIdx = Math.floor(scalar() * levels.length)
        arr[i] = levels[levelIdx]
      }
      break
    }
    case 'random':
    default: {
      for (let i = 0; i < n; i++) {
        arr[i] = Math.floor(scalar() * (valueMax - minVal + 1)) + minVal
      }
      break
    }
  }

  return arr
}

/** Legacy alias for backward compatibility. */
export function randomArray(n: number, valueMax = 100): number[] {
  return generateArray(n, 'random', valueMax)
}

function snapshot(arr: number[]): number[] {
  return arr.slice()
}

function readCounter(telemetry: Telemetry): void {
  telemetry.accesses += 1
}

const countCompare = (telemetry: Telemetry, a: number, b: number): boolean => {
  telemetry.comparisons += 1
  telemetry.accesses += 2
  return a < b
}

/** Bubble Sort — O(n²) average / O(n) best when nearly sorted. */
export function* bubbleSortGenerator(arr: number[], telemetry: Telemetry): SortGenerator {
  const n = arr.length
  for (let i = 0; i < n - 1; i++) {
    let swapped = false
    for (let j = 0; j < n - i - 1; j++) {
      readCounter(telemetry)
      yield { type: 'compare', indices: [j, j + 1], arrayState: snapshot(arr) }
      if (countCompare(telemetry, arr[j + 1], arr[j])) {
        const tmp = arr[j]
        arr[j] = arr[j + 1]
        arr[j + 1] = tmp
        telemetry.writes += 2
        swapped = true
        yield { type: 'swap', indices: [j, j + 1], arrayState: snapshot(arr) }
      }
    }
    yield { type: 'sorted', indices: [n - i - 1], arrayState: snapshot(arr) }
    if (!swapped) {
      for (let k = 0; k < n - i - 1; k++) {
        yield { type: 'sorted', indices: [k], arrayState: snapshot(arr) }
      }
      break
    }
  }
  if (n > 1) yield { type: 'sorted', indices: [0], arrayState: snapshot(arr) }
}

/** Insertion Sort — O(n²) average / O(n) best. Excellent for nearly sorted inputs. */
export function* insertionSortGenerator(arr: number[], telemetry: Telemetry): SortGenerator {
  const n = arr.length
  if (n > 0) yield { type: 'sorted', indices: [0], arrayState: snapshot(arr) }
  for (let i = 1; i < n; i++) {
    const key = arr[i]
    readCounter(telemetry)
    let j = i - 1
    while (j >= 0) {
      yield { type: 'compare', indices: [j, j + 1], arrayState: snapshot(arr) }
      telemetry.accesses += 1
      if (!countCompare(telemetry, key, arr[j])) break
      arr[j + 1] = arr[j]
      telemetry.writes += 1
      yield { type: 'overwrite', indices: [j + 1], value: arr[j], arrayState: snapshot(arr) }
      j--
    }
    arr[j + 1] = key
    telemetry.writes += 1
    yield { type: 'overwrite', indices: [j + 1], value: key, arrayState: snapshot(arr) }
    yield { type: 'sorted', range: [0, i], indices: [], arrayState: snapshot(arr) }
  }
}

/** Selection Sort — O(n²) comparisons always, exactly O(n) swaps. */
export function* selectionSortGenerator(arr: number[], telemetry: Telemetry): SortGenerator {
  const n = arr.length
  for (let i = 0; i < n - 1; i++) {
    let minIdx = i
    readCounter(telemetry)
    for (let j = i + 1; j < n; j++) {
      yield { type: 'compare', indices: [minIdx, j], arrayState: snapshot(arr) }
      if (countCompare(telemetry, arr[j], arr[minIdx])) minIdx = j
    }
    if (minIdx !== i) {
      const tmp = arr[i]
      arr[i] = arr[minIdx]
      arr[minIdx] = tmp
      telemetry.writes += 2
      yield { type: 'swap', indices: [i, minIdx], arrayState: snapshot(arr) }
    }
    yield { type: 'sorted', indices: [i], arrayState: snapshot(arr) }
  }
  if (n > 1) yield { type: 'sorted', indices: [n - 1], arrayState: snapshot(arr) }
}

/** Merge Sort — O(n log n) guaranteed. Stable divide-and-conquer. */
export function* mergeSortGenerator(arr: number[], telemetry: Telemetry): SortGenerator {
  const n = arr.length

  function* sort(lo: number, hi: number): SortGenerator {
    if (lo >= hi) return
    const mid = (lo + hi) >> 1
    yield* sort(lo, mid)
    yield* sort(mid + 1, hi)

    const left = arr.slice(lo, mid + 1)
    const right = arr.slice(mid + 1, hi + 1)
    let i = 0
    let j = 0
    let k = lo
    while (i < left.length && j < right.length) {
      yield { type: 'compare', indices: [lo + i, mid + 1 + j], arrayState: snapshot(arr) }
      if (countCompare(telemetry, left[i], right[j])) {
        arr[k] = left[i]
        i++
      } else {
        arr[k] = right[j]
        j++
      }
      telemetry.writes += 1
      yield { type: 'overwrite', indices: [k], value: arr[k], arrayState: snapshot(arr) }
      k++
    }
    while (i < left.length) {
      arr[k] = left[i]
      telemetry.writes += 1
      yield { type: 'overwrite', indices: [k], value: arr[k], arrayState: snapshot(arr) }
      k++
      i++
    }
    while (j < right.length) {
      arr[k] = right[j]
      telemetry.writes += 1
      yield { type: 'overwrite', indices: [k], value: arr[k], arrayState: snapshot(arr) }
      k++
      j++
    }
    yield { type: 'sorted', range: [lo, hi], indices: [], arrayState: snapshot(arr) }
  }

  yield* sort(0, n - 1)
}

/** Quick Sort (Lomuto partition) — O(n log n) avg, in-place partition. */
export function* quickSortGenerator(arr: number[], telemetry: Telemetry): SortGenerator {
  const n = arr.length

  function* qs(lo: number, hi: number): SortGenerator {
    if (lo > hi) return
    if (lo === hi) {
      yield { type: 'sorted', indices: [lo], arrayState: snapshot(arr) }
      return
    }
    const pivot = arr[hi]
    readCounter(telemetry)
    let i = lo - 1
    for (let j = lo; j < hi; j++) {
      yield { type: 'compare', indices: [j, hi], arrayState: snapshot(arr) }
      if (countCompare(telemetry, arr[j], pivot)) {
        i++
        if (i !== j) {
          const tmp = arr[i]
          arr[i] = arr[j]
          arr[j] = tmp
          telemetry.writes += 2
          yield { type: 'swap', indices: [i, j], arrayState: snapshot(arr) }
        }
      }
    }
    const p = i + 1
    if (p !== hi) {
      const tmp = arr[p]
      arr[p] = arr[hi]
      arr[hi] = tmp
      telemetry.writes += 2
      yield { type: 'swap', indices: [p, hi], arrayState: snapshot(arr) }
    }
    yield { type: 'sorted', indices: [p], arrayState: snapshot(arr) }
    yield* qs(lo, p - 1)
    yield* qs(p + 1, hi)
  }

  yield* qs(0, n - 1)
}

/** Heap Sort (Binary max-heap) — O(n log n) in-place non-recursive. */
export function* heapSortGenerator(arr: number[], telemetry: Telemetry): SortGenerator {
  const n = arr.length

  function* heapify(size: number, root: number): SortGenerator {
    let largest = root
    const left = 2 * root + 1
    const right = 2 * root + 2
    if (left < size) {
      yield { type: 'compare', indices: [left, largest], arrayState: snapshot(arr) }
      if (countCompare(telemetry, arr[largest], arr[left])) largest = left
    }
    if (right < size) {
      yield { type: 'compare', indices: [right, largest], arrayState: snapshot(arr) }
      if (countCompare(telemetry, arr[largest], arr[right])) largest = right
    }
    if (largest !== root) {
      const tmp = arr[root]
      arr[root] = arr[largest]
      arr[largest] = tmp
      telemetry.writes += 2
      yield { type: 'swap', indices: [root, largest], arrayState: snapshot(arr) }
      yield* heapify(size, largest)
    }
  }

  for (let i = (n >> 1) - 1; i >= 0; i--) yield* heapify(n, i)
  for (let end = n - 1; end > 0; end--) {
    const tmp = arr[0]
    arr[0] = arr[end]
    arr[end] = tmp
    telemetry.writes += 2
    yield { type: 'swap', indices: [0, end], arrayState: snapshot(arr) }
    yield { type: 'sorted', indices: [end], arrayState: snapshot(arr) }
    yield* heapify(end, 0)
  }
  if (n > 0) yield { type: 'sorted', indices: [0], arrayState: snapshot(arr) }
}

/** Registry mapping algorithm key -> generator function. */
export const GENERATORS: Record<SortingAlgorithmKey, (arr: number[], telemetry: Telemetry) => SortGenerator> = {
  bubble: bubbleSortGenerator,
  insertion: insertionSortGenerator,
  selection: selectionSortGenerator,
  merge: mergeSortGenerator,
  quick: quickSortGenerator,
  heap: heapSortGenerator,
}

/** Algorithm metadata. */
export const ALGORITHM_META: Record<SortingAlgorithmKey, AlgorithmMeta> = {
  bubble: {
    id: 'bubble',
    label: 'Bubble Sort',
    paradigm: 'Comparison / Exchange',
    description: 'Iteratively sweeps through adjacent pairs, bubbling the largest unsorted element to the end.',
    bestFor: 'Teaching foundational mechanics; detecting already sorted arrays in O(n).',
    complexity: { timeBest: 'O(n)', timeAverage: 'O(n²)', timeWorst: 'O(n²)', space: 'O(1)' },
    stable: true,
  },
  insertion: {
    id: 'insertion',
    label: 'Insertion Sort',
    paradigm: 'Incremental Insertion',
    description: 'Builds the final sorted sequence one item at a time by sliding each key into its correct relative spot.',
    bestFor: 'Small arrays (n < 30) and nearly-sorted real-time streams.',
    complexity: { timeBest: 'O(n)', timeAverage: 'O(n²)', timeWorst: 'O(n²)', space: 'O(1)' },
    stable: true,
  },
  selection: {
    id: 'selection',
    label: 'Selection Sort',
    paradigm: 'Selection / In-Place',
    description: 'Finds the minimum element from the unsorted suffix and swaps it directly into the current prefix boundary.',
    bestFor: 'Systems where write operations are significantly more costly than reads (at most n-1 swaps).',
    complexity: { timeBest: 'O(n²)', timeAverage: 'O(n²)', timeWorst: 'O(n²)', space: 'O(1)' },
    stable: false,
  },
  merge: {
    id: 'merge',
    label: 'Merge Sort',
    paradigm: 'Divide & Conquer',
    description: 'Recursively splits the array into singletons, then merges ordered halves in linear time.',
    bestFor: 'Guaranteed O(n log n) predictable runtime and stable sorting of linked lists or large datasets.',
    complexity: { timeBest: 'O(n log n)', timeAverage: 'O(n log n)', timeWorst: 'O(n log n)', space: 'O(n)' },
    stable: true,
  },
  quick: {
    id: 'quick',
    label: 'Quick Sort',
    paradigm: 'Partitioning',
    description: 'Selects a pivot, partitions elements into smaller/greater sub-arrays, and recursively sorts each partition.',
    bestFor: 'Fastest general-purpose cache-friendly in-place sorting in practice.',
    complexity: { timeBest: 'O(n log n)', timeAverage: 'O(n log n)', timeWorst: 'O(n²)', space: 'O(log n)' },
    stable: false,
  },
  heap: {
    id: 'heap',
    label: 'Heap Sort',
    paradigm: 'Priority Queue',
    description: 'Transforms the array into a binary max-heap, then repeatedly extracts the root to the sorted tail.',
    bestFor: 'Embedded or memory-critical systems requiring O(n log n) without auxiliary memory.',
    complexity: { timeBest: 'O(n log n)', timeAverage: 'O(n log n)', timeWorst: 'O(n log n)', space: 'O(1)' },
    stable: false,
  },
}

export const ALGORITHM_LIST: AlgorithmMeta[] = Object.values(ALGORITHM_META)

/** Distribution preset metadata. */
export const DISTRIBUTION_META: Record<ArrayDistributionKey, DistributionMeta> = {
  random: {
    id: 'random',
    label: 'Random',
    description: 'Uniform random distribution across the entire range.',
  },
  reversed: {
    id: 'reversed',
    label: 'Reversed',
    description: 'Strictly descending elements. Triggers worst-case O(n²) for Bubble, Insertion, and simple QuickSort.',
  },
  nearlySorted: {
    id: 'nearlySorted',
    label: 'Nearly Sorted',
    description: 'Array with ~92% elements in order. Demonstrates adaptive algorithms running in linear time.',
  },
  fewUnique: {
    id: 'fewUnique',
    label: 'Few Unique',
    description: 'Contains only 4 distinct values repeated across the array. Tests stability and duplicate handling.',
  },
}

export const DISTRIBUTION_LIST: DistributionMeta[] = Object.values(DISTRIBUTION_META)

/** Returns the step's bar-state class used by the renderer. */
export function stepToBarState(type: SortStep['type']): BarState {
  switch (type) {
    case 'compare':
      return 'comparing'
    case 'swap':
      return 'swapping'
    case 'overwrite':
      return 'overwriting'
    case 'sorted':
      return 'sorted'
  }
}
import type { AlgorithmMeta, BarState, SortingAlgorithmKey, SortGenerator, SortStep, Telemetry } from '@/lib/types'

/**
 * Sorting algorithm generators.
 *
 * Each generator receives a working copy of the array plus a telemetry object.
 * It yields `SortStep` frames that the engine replays onto the rendered bars;
 * the working array is mutated in place, so generators never touch the DOM.
 *
 * Telemetry is the single source of truth for the live counters:
 *   - comparisons: every `<`/`>`/`<=` relation evaluated
 *   - writes:      every cell overwrite (swap counts as 2)
 *   - accesses:    every read of an array element (a full pass over two sides).
 */

const scalar = Math.random

/** A fresh random array of `n` values in [1, valueMax]. */
export function randomArray(n: number, valueMax = 100): number[] {
  const arr = new Array<number>(n)
  for (let i = 0; i < n; i++) arr[i] = Math.floor(scalar() * valueMax) + 1
  return arr
}

function snapshot(arr: number[]): number[] {
  return arr.slice()
}

/**
 * Wrap an array read so we can count bucket-accesses. To keep overhead low,
 * only swap/overwrite frames snapshot the array; compare frames pass `null`.
 */
function readCounter(telemetry: Telemetry): void {
  telemetry.accesses += 1
}

const countCompare = (telemetry: Telemetry, a: number, b: number): boolean => {
  telemetry.comparisons += 1
  telemetry.accesses += 2
  return a < b
}

/** Bubble Sort — O(n²) average / O(n) best. */
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

/** Insertion Sort — O(n²) average / O(n) best. */
export function* insertionSortGenerator(arr: number[], telemetry: Telemetry): SortGenerator {
  const n = arr.length
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
    yield { type: 'sorted', indices: [i], arrayState: snapshot(arr) }
  }
}

/** Selection Sort — O(n²) regardless of input. */
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

/** Merge Sort — O(n log n). Writes are done in place with `overwrite` frames. */
export function* mergeSortGenerator(arr: number[], telemetry: Telemetry): SortGenerator {
  const n = arr.length

  function* sort(lo: number, hi: number): SortGenerator {
    if (lo >= hi) {
      return
    }
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

/** Quick Sort (Lomuto partition, last element as pivot) — O(n log n) avg. */
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

/** Heap Sort (max-heap) — O(n log n) always. */
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

/** Algorithm metadata (labels, complexity badges, stability). */
export const ALGORITHM_META: Record<SortingAlgorithmKey, AlgorithmMeta> = {
  bubble: {
    id: 'bubble',
    label: 'Bubble Sort',
    description: 'Repeatedly steps through the list, swapping adjacent elements that are out of order.',
    complexity: { timeBest: 'O(n)', timeAverage: 'O(n²)', timeWorst: 'O(n²)', space: 'O(1)' },
    stable: true,
  },
  insertion: {
    id: 'insertion',
    label: 'Insertion Sort',
    description: 'Builds the sorted array one element at a time, shifting larger elements right.',
    complexity: { timeBest: 'O(n)', timeAverage: 'O(n²)', timeWorst: 'O(n²)', space: 'O(1)' },
    stable: true,
  },
  selection: {
    id: 'selection',
    label: 'Selection Sort',
    description: 'Repeatedly selects the smallest remaining element and moves it to the front.',
    complexity: { timeBest: 'O(n²)', timeAverage: 'O(n²)', timeWorst: 'O(n²)', space: 'O(1)' },
    stable: false,
  },
  merge: {
    id: 'merge',
    label: 'Merge Sort',
    description: 'Divides the array, sorts the halves, then merges them in linear time.',
    complexity: { timeBest: 'O(n log n)', timeAverage: 'O(n log n)', timeWorst: 'O(n log n)', space: 'O(n)' },
    stable: true,
  },
  quick: {
    id: 'quick',
    label: 'Quick Sort',
    description: 'Partitions around a pivot and recursively sorts the two sides.',
    complexity: { timeBest: 'O(n log n)', timeAverage: 'O(n log n)', timeWorst: 'O(n²)', space: 'O(log n)' },
    stable: false,
  },
  heap: {
    id: 'heap',
    label: 'Heap Sort',
    description: 'Builds a max-heap, then repeatedly extracts the maximum element.',
    complexity: { timeBest: 'O(n log n)', timeAverage: 'O(n log n)', timeWorst: 'O(n log n)', space: 'O(1)' },
    stable: false,
  },
}

/** Ordered list of all algorithms for rendering the selector. */
export const ALGORITHM_LIST: AlgorithmMeta[] = Object.values(ALGORITHM_META)

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
/**
 * Shared type definitions for the sorting engine.
 */

import type { Ref } from 'vue'

/** A single frame emitted by a sorting algorithm generator. */
export type SortStepType = 'compare' | 'swap' | 'overwrite' | 'sorted'

/**
 * A step payload yielded by a sorting generator.
 *
 * - `compare`: highlight the two indices being compared (indices: [a, b]).
 * - `swap`:    swap the values at `indices`.
 * - `overwrite`: write `fromValue` (or `arrayState`) back into the array at
 *                `indices`; used by merge sort when cells are filled in-place.
 * - `sorted`:  mark the given index (or range) as sorted / in-place.
 */
export interface SortStep {
  type: SortStepType
  /** Primary indices affected. For `overwrite` this is the target slot. */
  indices: number[]
  /** For `sorted`, an optional inclusive range [from, to] to mark at once. */
  range?: [number, number]
  /** Optional snapshot of the internal working array after this step. */
  arrayState?: number[]
  /** For `overwrite`: the outbound value being written (to animate height). */
  value?: number
  /** For `overwrite` on a range of yields: fine-grained "slot filled" flag. */
  filled?: boolean
}

/** Distinct visual states a bar can occupy. */
export type BarState = 'default' | 'comparing' | 'swapping' | 'overwriting' | 'sorted'

/** Each bar rendered in the canvas. */
export interface BarModel {
  id: number
  value: number
  state: BarState
  /** Height as a percentage of the tallest bar (0-100), for the template. */
  heightPct: number
}

/** Complexity strings shown in the algorithm metadata. */
export interface Complexity {
  timeBest: string
  timeAverage: string
  timeWorst: string
  space: string
}

/** Static metadata describing an available sorting algorithm. */
export interface AlgorithmMeta {
  id: SortingAlgorithmKey
  label: string
  description: string
  complexity: Complexity
  stable: boolean
}

/** Keys of the built-in algorithm generators. */
export type SortingAlgorithmKey =
  | 'bubble'
  | 'insertion'
  | 'selection'
  | 'merge'
  | 'quick'
  | 'heap'

/** A generator that yields `SortStep` frames; null steps mark "pass-through". */
export type SortGenerator = Generator<SortStep | null, void, unknown>

/** High-frequency telemetry counters tracked during a run. */
export interface Telemetry {
  comparisons: number
  writes: number
  accesses: number
}

/** Execution phase of the engine. */
export type EngineStatus = 'idle' | 'running' | 'paused' | 'complete'

/** Public configuration controller exposed by the engine composable. */
export interface SortingEngine {
  readonly status: Readonly<Ref<EngineStatus>>
  readonly bars: Readonly<Ref<BarModel[]>>
  readonly telemetry: Readonly<Ref<Telemetry>>
  readonly elapsed: Readonly<Ref<number>>
  readonly algorithm: Readonly<Ref<SortingAlgorithmKey>>
  readonly speed: Readonly<Ref<number>>
  readonly arraySize: Readonly<Ref<number>>

  selectAlgorithm: (key: SortingAlgorithmKey) => void
  setSpeed: (speed: number) => void
  setArraySize: (size: number) => void
  start: () => void
  pause: () => void
  resume: () => void
  reset: () => void
  stepForward: () => void
}
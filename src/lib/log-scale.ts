/**
 * Eased scales for sliders and steppers: fine where the hand needs precision (near now, small
 * amounts) and coarse where a minute or a tenth would only be noise.
 *
 * A scale is a ladder of allowed values built from segments ("every 1 up to 15, every 5 up to 60,
 * every 10 up to 180 …"). A range input with one position per rung gets the ease for free: equal
 * thumb travel covers 1 minute near now and 30 minutes far back, the way a log axis does, while
 * every stop is still a value people say out loud. The same ladder drives the −/+ buttons, so
 * tapping and dragging always land on the same stops.
 *
 * Pure functions, no DOM. Components read `values`, `indexOf`, `snap` and `move`.
 */

export interface Segment {
  /** Last value of this segment (inclusive); segments must be in increasing order. */
  upTo: number;
  /** Distance between rungs inside this segment. */
  step: number;
}

export interface Ladder {
  /** Every allowed value, ascending; `values[0]` is the minimum and the last is the maximum. */
  values: number[];
  min: number;
  max: number;
  /** Index of the nearest rung (ties go to the higher rung). */
  indexOf(value: number): number;
  /** The nearest rung. */
  snap(value: number): number;
  /** The rung `by` steps away from the nearest rung, clamped to the ends. */
  move(value: number, by: number): number;
  /** How far `move(value, by)` would travel (0 at an end). */
  delta(value: number, by: number): number;
}

const round = (v: number) => Math.round(v * 1e6) / 1e6;

export function ladder(min: number, segments: Segment[]): Ladder {
  const values: number[] = [round(min)];
  for (const { upTo, step } of segments) {
    if (step <= 0) throw new Error("ladder: step must be positive");
    let v = values[values.length - 1]!;
    while (v + step <= upTo + 1e-9) {
      v = round(v + step);
      values.push(v);
    }
  }
  const last = values.length - 1;
  const indexOf = (value: number) => {
    if (Number.isNaN(value) || value <= values[0]!) return 0;
    if (value >= values[last]!) return last;
    let lo = 0;
    let hi = last;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (values[mid]! <= value) lo = mid;
      else hi = mid;
    }
    return value - values[lo]! < values[hi]! - value ? lo : hi;
  };
  const move = (value: number, by: number) => values[Math.min(last, Math.max(0, indexOf(value) + by))]!;
  return {
    values,
    min: values[0]!,
    max: values[last]!,
    indexOf,
    snap: (value) => values[indexOf(value)]!,
    move,
    delta: (value, by) => round(move(value, by) - values[indexOf(value)]!),
  };
}

/**
 * How long ago a drink was finished, in minutes, back to 12 h (the night window is 48 h but a
 * drink further back than this wouldn't count anyway): 1-minute rungs in the first quarter hour,
 * 5 to the hour, 10 to 3 h, 15 to 6 h, then 30. 61 rungs in all.
 */
export const minutesAgoScale = ladder(0, [
  { upTo: 15, step: 1 },
  { upTo: 60, step: 5 },
  { upTo: 180, step: 10 },
  { upTo: 360, step: 15 },
  { upTo: 720, step: 30 },
]);

/**
 * Standard drinks (in the region's own standard), from a tenth to 200 (the server's limit; a US handle is about 55): tenths under 2, halves to
 * 10, whole drinks to 50, then fives.
 */
export const standardsScale = ladder(0.1, [
  { upTo: 2, step: 0.1 },
  { upTo: 10, step: 0.5 },
  { upTo: 50, step: 1 },
  { upTo: 200, step: 5 },
]);

import { type ReactNode, useEffect, useState } from "react";
import { useReducedMotion } from "./useReducedMotion";

/**
 * Keeps a conditionally rendered panel mounted for its exit, so it can leave the way it came.
 * Render `{mounted && <div data-state={state} …>}`; CSS plays the exit on `[data-state="closed"]`.
 * `ms` should match that exit's duration. Under reduced motion it unmounts at once.
 */
export function usePresence(open: boolean, ms = 200) {
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(open);
  // Mount in the same render that opens, so the entrance never waits a frame.
  if (open && !mounted) setMounted(true);
  useEffect(() => {
    if (open || !mounted || reduced) return;
    const id = setTimeout(() => setMounted(false), ms);
    return () => clearTimeout(id);
  }, [open, mounted, ms, reduced]);
  // Under reduced motion a closed panel is simply gone, with no exit to wait for.
  return { mounted: open || (mounted && !reduced), state: open ? "open" : "closed" } as const;
}

/**
 * While `open`, returns `value`; once closed, keeps returning the last value it had while open.
 * A leaving sheet or panel keeps showing what it showed instead of blanking mid-exit
 * (e.g. `{drink && …}` going false the moment the sheet starts to slide away).
 */
export function useHeld<T>(open: boolean, value: T): T {
  const [kept, setKept] = useState(value);
  if (open && !Object.is(kept, value)) setKept(value);
  return open ? value : kept;
}

/**
 * Holds its children while closed (see useHeld). A component of its own so the hold re-renders
 * only this, and so the children's identity is stable across that re-render.
 */
export function Held({ open, children }: { open: boolean; children: ReactNode }) {
  return useHeld(open, children);
}

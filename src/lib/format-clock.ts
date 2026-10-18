/**
 * The one clock format for the app: "10:40 pm", "11 pm", "2:30" (no period when the reader already
 * has it). Written by hand rather than with toLocaleTimeString so every screen, the server render and
 * the tests agree, whatever locale the browser reports.
 */
export interface ClockOptions {
  /** Add " am"/" pm" (default true). */
  period?: boolean;
  /** Drop ":00" on the hour: "11 pm" (default false). */
  compact?: boolean;
}

export function formatClock(time: Date | number, { period = true, compact = false }: ClockOptions = {}): string {
  const d = typeof time === "number" ? new Date(time) : time;
  const h24 = d.getHours();
  const m = d.getMinutes();
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  const text = compact && m === 0 ? `${h}` : `${h}:${String(m).padStart(2, "0")}`;
  return period ? `${text} ${h24 < 12 ? "am" : "pm"}` : text;
}

/** "11pm": hour labels on chart axes. */
export function formatHour(time: Date | number): string {
  return formatClock(time, { compact: true }).replace(" ", "");
}

import { loadFont } from "@remotion/google-fonts/Geist";
import { Easing, interpolate } from "remotion";

// Tokens copied from src/app/dev/directions/glass/glass.css (direction "Glass").
export const G = {
  bg: "#09090b",
  card: "#0f0f12",
  card2: "#16161a",
  edge: "#27272a",
  edge2: "#3f3f46",
  ink: "#fafafa",
  ink2: "#a1a1aa",
  signal: "#7cb4ff",
  alert: "#ffa494",
  glass: "rgb(24 24 28 / 0.62)",
  glassStrong: "rgb(18 18 22 / 0.78)",
  sheen: "rgb(255 255 255 / 0.14)",
};

export const { fontFamily } = loadFont("normal", {
  weights: ["400", "500", "600"],
  subsets: ["latin"],
});

/** The app's --ease-out: exponential ease-out. Used for every move. */
export const EASE = Easing.bezier(0.16, 1, 0.3, 1);

/** 0 → 1 from `start` over `dur` frames, eased, clamped. */
export const ramp = (frame: number, start: number, dur: number) =>
  interpolate(frame, [start, start + dur], [0, 1], {
    easing: EASE,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

/** The phone screen: 375 css px wide. Height depends on the frame it is shown in. */
export const SCREEN_W = 375;

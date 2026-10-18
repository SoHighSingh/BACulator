import { useId } from "react";

/**
 * Logo options for the user's brief: a blue-to-red gradient running corner to corner with a dot in
 * the centre, and the whole mark turning red while it's not safe to drive. Each option is a plain
 * inline SVG on a 64-unit grid, so the chosen one can be lifted straight into BrandMark.
 *
 * `bleed` drops the tile's rounded corners and rim for app-icon renders, where the OS crops it.
 */
export type MarkState = "calm" | "alert";
export interface MarkProps {
  state: MarkState;
  size?: number;
  bleed?: boolean;
  title?: string;
}

/** Calm runs signal blue to warm red, corner to corner; alert is the coral-to-red family only. */
const RAMP: Record<MarkState, [string, string, string]> = {
  // Through violet rather than straight across, which goes a muddy mauve in the middle.
  calm: ["#7cb4ff", "#b48cf2", "#ff6a55"],
  alert: ["#ffb2a4", "#ff8775", "#ff5a45"],
};
const TILE = "#111114";
const DOT = "#fafafa";

function Svg({
  size = 44,
  title = "BACulator",
  children,
}: {
  size?: number;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
      className="shrink-0"
    >
      {children}
    </svg>
  );
}

function useIds() {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  return { grad: `g${id}`, rim: `r${id}`, sheen: `s${id}` };
}

function Ramp({
  id,
  state,
  x1 = 0,
  y1 = 0,
  x2 = 64,
  y2 = 64,
}: {
  id: string;
  state: MarkState;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
}) {
  const [a, m, b] = RAMP[state];
  return (
    <linearGradient
      id={id}
      gradientUnits="userSpaceOnUse"
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
    >
      <stop offset="0.08" stopColor={a} />
      <stop offset="0.5" stopColor={m} />
      <stop offset="0.92" stopColor={b} />
    </linearGradient>
  );
}

function Rim({ id }: { id: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#fff" stopOpacity="0.38" />
      <stop offset="0.5" stopColor="#fff" stopOpacity="0.05" />
      <stop offset="1" stopColor="#fff" stopOpacity="0.16" />
    </linearGradient>
  );
}

/** The dark glass tile the other top-bar keys are made of. */
function DarkTile({ rim, bleed }: { rim: string; bleed?: boolean }) {
  return bleed ? (
    <rect width="64" height="64" fill={TILE} />
  ) : (
    <rect
      x="0.5"
      y="0.5"
      width="63"
      height="63"
      rx="16"
      fill={TILE}
      stroke={`url(#${rim})`}
    />
  );
}

/** On icon renders the glyph shrinks to sit inside the maskable safe zone (the centred 80% circle). */
function Glyph({
  bleed,
  children,
}: {
  bleed?: boolean;
  children: React.ReactNode;
}) {
  return bleed ? (
    <g transform="translate(32 32) scale(0.76) translate(-32 -32)">
      {children}
    </g>
  ) : (
    <>{children}</>
  );
}

/* ------------------------------------------------------------------------------------------- */

/** A · Lit tile: the whole tile is the gradient, one white dot in the centre. */
export function MarkTile({ state, size, bleed, title }: MarkProps) {
  const ids = useIds();
  return (
    <Svg size={size} title={title}>
      <defs>
        <Ramp id={ids.grad} state={state} />
        <linearGradient id={ids.sheen} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.22" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {bleed ? (
        <>
          <rect width="64" height="64" fill={`url(#${ids.grad})`} />
          <rect width="64" height="64" fill={`url(#${ids.sheen})`} />
        </>
      ) : (
        <>
          <rect width="64" height="64" rx="16" fill={`url(#${ids.grad})`} />
          <rect width="64" height="64" rx="16" fill={`url(#${ids.sheen})`} />
          <rect
            x="0.5"
            y="0.5"
            width="63"
            height="63"
            rx="15.5"
            fill="none"
            stroke="#fff"
            strokeOpacity="0.28"
          />
        </>
      )}
      <circle cx="32" cy="32" r="10" fill={DOT} />
    </Svg>
  );
}

const DROP = "M32 5C32 5 12 27 12 40a20 20 0 0 0 40 0C52 27 32 5 32 5Z";

/** B · Gradient drop: a drop of the night, lit blue to red corner to corner, the reading dot in its belly. */
export function MarkDrop({ state, size, bleed, title }: MarkProps) {
  const ids = useIds();
  return (
    <Svg size={size} title={title}>
      <defs>
        <Rim id={ids.rim} />
        <Ramp id={ids.grad} state={state} x1={12} y1={5} x2={52} y2={60} />
      </defs>
      <DarkTile rim={ids.rim} bleed={bleed} />
      <Glyph bleed={bleed}>
        <path
          d={DROP}
          fill={`url(#${ids.grad})`}
          stroke={`url(#${ids.grad})`}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <circle cx="32" cy="41" r="8.5" fill={DOT} />
      </Glyph>
    </Svg>
  );
}

/** C · Open orbit: a thick gradient ring, broken at the top right so it never closes into a target, the dot at its heart. */
export function MarkOrbit({ state, size, bleed, title }: MarkProps) {
  const ids = useIds();
  // A 280° arc: the 80° gap is centred on the top-right corner, so it never closes into a target.
  const r = 19.5;
  const a0 = (-5 * Math.PI) / 180; // just above 3 o'clock, clockwise round to...
  const a1 = (-85 * Math.PI) / 180; // ...just right of 12 o'clock
  const p = (a: number) =>
    `${(32 + r * Math.cos(a)).toFixed(2)} ${(32 + r * Math.sin(a)).toFixed(2)}`;
  return (
    <Svg size={size} title={title}>
      <defs>
        <Rim id={ids.rim} />
        <Ramp id={ids.grad} state={state} x1={8} y1={8} x2={56} y2={56} />
      </defs>
      <DarkTile rim={ids.rim} bleed={bleed} />
      <Glyph bleed={bleed}>
        <path
          d={`M${p(a0)}A${r} ${r} 0 1 1 ${p(a1)}`}
          fill="none"
          stroke={`url(#${ids.grad})`}
          strokeWidth="11"
          strokeLinecap="round"
        />
        <circle cx="32" cy="32" r="7.5" fill={DOT} />
      </Glyph>
    </Svg>
  );
}

/** D · Range band: the app's own range strip laid corner to corner across the tile, the dot riding its middle. */
export function MarkBand({ state, size, bleed, title }: MarkProps) {
  const ids = useIds();
  const clip = `c${ids.grad}`;
  return (
    <Svg size={size} title={title}>
      <defs>
        <Rim id={ids.rim} />
        <Ramp id={ids.grad} state={state} x1={6} y1={6} x2={58} y2={58} />
        <clipPath id={clip}>
          <rect width="64" height="64" rx={bleed ? 0 : 16} />
        </clipPath>
      </defs>
      <DarkTile rim={ids.rim} bleed={bleed} />
      {/* Square-ended and run off both corners, so it reads as a stripe, never a capsule. */}
      <g clipPath={`url(#${clip})`}>
        <line
          x1="-6"
          y1="-6"
          x2="70"
          y2="70"
          stroke={`url(#${ids.grad})`}
          strokeWidth="20"
        />
      </g>
      {!bleed && (
        <rect
          x="0.5"
          y="0.5"
          width="63"
          height="63"
          rx="15.5"
          fill="none"
          stroke={`url(#${ids.rim})`}
        />
      )}
      <circle cx="32" cy="32" r="11.5" fill={TILE} />
      <circle cx="32" cy="32" r="8" fill={DOT} />
    </Svg>
  );
}

export const OPTIONS = [
  {
    id: "A",
    name: "Lit tile",
    rationale:
      "The idea at its plainest: the tile itself is the light, blue to red corner to corner, with one white reading dot. Boldest at 16px; the only option that is a colour block in the top bar.",
    Mark: MarkTile,
  },
  {
    id: "B",
    name: "Gradient drop",
    rationale:
      "Keeps the drink (the G drop that read best small) and lets the gradient run through it, the dot sitting where the level is read. Says alcohol without a glass or a bottle.",
    Mark: MarkDrop,
  },
  {
    id: "C",
    name: "Open orbit",
    rationale:
      "A heavy gradient ring around the reading point, left open at the top right so it reads as a C or an orbit rather than a target. The most abstract and app-icon-like.",
    Mark: MarkOrbit,
  },
  {
    id: "D",
    name: "Range band",
    rationale:
      "The estimate's range strip as a square-ended stripe running off the tile corner to corner, the dot riding its middle like the white tick on the night screen. Ties the mark to the product's one motif.",
    Mark: MarkBand,
  },
] as const;

export type OptionId = (typeof OPTIONS)[number]["id"];

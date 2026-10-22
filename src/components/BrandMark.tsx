import { useId } from "react";

/**
 * The BACulator mark: the estimate's own range strip (a likely-range band with the point marked)
 * on a dark glass tile. It stands in for the wordmark in the app's top bar; the name stays in its
 * accessible label.
 *
 * `tone="alert"` is the mark "in trouble": the same shape, with the band in the alert family
 * (#ffa494 over a deeper #ff6a55 glow) and a warm rim, whenever the shown number is 0.05 or more.
 * The tick stays white and steps 6 units to the right, the needle moving up. Both bands are always
 * drawn and cross-fade with `.bm-tone` (250ms) while the tick slides (`.bm-tick`, same clock); both
 * only animate inside an animating `.night-status` and are instant under reduced motion, so
 * flipping the prop never redraws the mark and nothing plays on load. Ids come from `useId`, so
 * several marks (and the favicon, which reuses this SVG) can share a document.
 */
/**
 * The tile's outline as the app's squircle (CSS `corner-shape: squircle`), so the mark's corners
 * match the keys beside it: radius 13 at 48 px (17.33 on this 64 grid). Each corner is a cubic
 * with its control points 0.909 of the way along (the n = 4 superellipse; 0.552 would be a circle).
 */
function squircle(x: number, y: number, w: number, h: number, r: number) {
  const c = r * (1 - 0.909);
  const [x1, y1] = [x + w, y + h];
  return [
    `M${x + r} ${y}`,
    `H${x1 - r}`,
    `C${x1 - c} ${y} ${x1} ${y + c} ${x1} ${y + r}`,
    `V${y1 - r}`,
    `C${x1} ${y1 - c} ${x1 - c} ${y1} ${x1 - r} ${y1}`,
    `H${x + r}`,
    `C${x + c} ${y1} ${x} ${y1 - c} ${x} ${y1 - r}`,
    `V${y + r}`,
    `C${x} ${y + c} ${x + c} ${y} ${x + r} ${y}`,
    "Z",
  ].join(" ");
}
const TILE = squircle(0.5, 0.5, 63, 63, (13 / 48) * 64);

export function BrandMark({ size = 40, title = "BACulator", tone = "calm" }: { size?: number; title?: string; tone?: "calm" | "alert" }) {
  const id = useId().replace(/:/g, "");
  const rim = `bm-rim-${id}`;
  const rimAlert = `bm-rim-alert-${id}`;
  const glow = `bm-glow-${id}`;
  const alert = tone === "alert";
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={title} className="shrink-0" data-tone={tone}>
      <defs>
        <linearGradient id={rim} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.38" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.05" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.16" />
        </linearGradient>
        <linearGradient id={rimAlert} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffd2c8" stopOpacity="0.5" />
          <stop offset="0.5" stopColor="#ffa494" stopOpacity="0.1" />
          <stop offset="1" stopColor="#ff6a55" stopOpacity="0.3" />
        </linearGradient>
        <filter id={glow} x="-30%" y="-200%" width="160%" height="500%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
      </defs>
      <path d={TILE} fill="#111114" stroke={`url(#${rim})`} />
      {/* The warm tile: a faint red cast and a warm rim, cross-faded over the calm one. */}
      <g className="bm-tone" opacity={alert ? 1 : 0}>
        <path d={TILE} fill="#1a0f0e" stroke={`url(#${rimAlert})`} />
      </g>
      <rect x="11" y="30" width="42" height="4" rx="2" fill="#fff" fillOpacity="0.14" />
      <g className="bm-tone" opacity={alert ? 0 : 1}>
        <rect x="19" y="29" width="28" height="6" rx="3" fill="#7cb4ff" filter={`url(#${glow})`} opacity="0.8" />
        <rect x="19" y="29.5" width="28" height="5" rx="2.5" fill="#7cb4ff" />
      </g>
      <g className="bm-tone" opacity={alert ? 1 : 0}>
        <rect x="18" y="28" width="30" height="8" rx="4" fill="#ff6a55" filter={`url(#${glow})`} opacity="0.9" />
        <rect x="19" y="29.5" width="28" height="5" rx="2.5" fill="#ffa494" />
      </g>
      {/* The tick: white in both tones; in alert it stands 6 units further right (x 34), as if the
          needle had moved up. It slides there with the morph (`.bm-tick`, globals.css). */}
      <g className={`bm-tick ${alert ? "is-alert" : ""}`}>
        <rect x="28" y="22" width="4" height="20" rx="2" fill="#fafafa" />
      </g>
    </svg>
  );
}

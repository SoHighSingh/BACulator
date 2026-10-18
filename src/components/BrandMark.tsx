import { useId } from "react";

/**
 * The BACulator mark: the estimate's own range strip (a likely-range band with the point marked)
 * on a dark glass tile. It stands in for the wordmark in the app's top bar; the name stays in its
 * accessible label.
 *
 * `tone="alert"` is the mark "in trouble": the same shape, with the band in the alert family
 * (#ffa494 over a deeper #ff6a55 glow) and a warm rim, whenever the night is not safe to drive.
 * The tick stays white. Both bands are always drawn and cross-fade with `.bm-tone` (250ms, off
 * under reduced motion), so flipping the prop never redraws the mark. Ids come from `useId`, so
 * several marks (and the favicon, which reuses this SVG) can share a document.
 */
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
      <rect x="0.5" y="0.5" width="63" height="63" rx="16" fill="#111114" stroke={`url(#${rim})`} />
      {/* The warm tile: a faint red cast and a warm rim, cross-faded over the calm one. */}
      <g className="bm-tone" opacity={alert ? 1 : 0}>
        <rect x="0.5" y="0.5" width="63" height="63" rx="16" fill="#1a0f0e" stroke={`url(#${rimAlert})`} />
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
      <rect x="28" y="22" width="4" height="20" rx="2" fill="#fafafa" />
    </svg>
  );
}

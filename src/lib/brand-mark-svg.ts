/**
 * The BACulator mark as a standalone SVG string, for everything that can't render the React
 * `BrandMark`: app icons, the favicon, the alert favicon's data: URL, the OG image.
 *
 * Same drawing as `src/components/BrandMark.tsx`: the estimate's range strip (a glowing band with
 * a white tick for now) on a dark glass tile with a lit rim. Keep the two in step.
 *
 * Tones: "calm" is the everyday blue. "alert" is the red the night screen turns whenever drinks
 * are counted (not safe to drive): coral band, hotter glow, slightly warmed rim; the tick stays white.
 */
export type BrandTone = "calm" | "alert";

export interface BrandMarkSvgOptions {
  /**
   * Full-square tile (no rounded corners) with the glyph inside the maskable 80% safe zone.
   * For launcher icons: iOS and Android masks cut their own shape out of it.
   */
  bleed?: boolean;
  /**
   * Favicon-size drawing (16–32px): a fatter band and a short tick, no blur filter.
   * At those sizes the standard 28×5 strip blurs into a smear; this still reads as the same mark.
   */
  small?: boolean;
  /** Rendered width/height attributes in px. Omitted: the SVG scales to its container. */
  size?: number;
}

/** Rim stops [colour, opacity] run top-left to bottom-right; the alert rim matches BrandMark.tsx. */
export const BRAND_TONES: Record<BrandTone, { band: string; glow: string; rim: [string, number][] }> = {
  calm: {
    band: "#7cb4ff",
    glow: "#7cb4ff",
    rim: [["#ffffff", 0.38], ["#ffffff", 0.05], ["#ffffff", 0.16]],
  },
  alert: {
    band: "#ffa494",
    glow: "#ff6a55",
    rim: [["#ffd2c8", 0.5], ["#ffa494", 0.1], ["#ff6a55", 0.3]],
  },
};

/** Tile fill shared by every variant (the night screen's glass, a step above `bg`). */
export const BRAND_TILE = "#111114";
const TICK = "#fafafa";

let uid = 0;

export function brandMarkSvg(tone: BrandTone = "calm", opts: BrandMarkSvgOptions = {}): string {
  const { bleed = false, small = false, size } = opts;
  const t = BRAND_TONES[tone];
  // Unique ids so two inline copies on one page (calm + alert) never share a gradient.
  const id = `bm${(uid = (uid + 1) % 1000)}`;

  // A range strip, not a cross: the band is clearly wider than the tick is tall, and the tick sits
  // at 40% of the band (now, inside the likely range), as on the night screen.
  const glyph = small
    ? // Favicon, on the 16px pixel grid (4 units = 1px): track to the tile edges, band 48×12,
      // tick 4×20 at 37.5% of the band (pixel-snapped). Centred on y=34 so every edge lands on a whole pixel at 16px.
      `<rect x="4" y="32" width="56" height="4" rx="2" fill="#fff" fill-opacity="0.18"/>` +
      `<rect x="8" y="28" width="48" height="12" rx="6" fill="${t.band}"/>` +
      `<rect x="24" y="24" width="4" height="20" rx="2" fill="${TICK}"/>`
    : // Standard: track 42×4, band 28×5 (glow 28×6), tick 4×20 at 40% of the band.
      `<rect x="11" y="30" width="42" height="4" rx="2" fill="#fff" fill-opacity="0.14"/>` +
      `<rect x="19" y="29" width="28" height="6" rx="3" fill="${t.glow}" filter="url(#${id}-glow)" opacity="0.8"/>` +
      `<rect x="19" y="29.5" width="28" height="5" rx="2.5" fill="${t.band}"/>` +
      `<rect x="28" y="22" width="4" height="20" rx="2" fill="${TICK}"/>`;

  // The favicon's rim is a 2px stroke, so it gets a little more opacity to survive the tiny size.
  const rimBoost = small ? 0.12 : 0;
  const defs =
    `<linearGradient id="${id}-rim" x1="0" y1="0" x2="1" y2="1">` +
    t.rim.map(([c, o], i) => `<stop offset="${i / 2}" stop-color="${c}" stop-opacity="${+(o + rimBoost).toFixed(2)}"/>`).join("") +
    `</linearGradient>` +
    (small
      ? ""
      : `<filter id="${id}-glow" x="-30%" y="-200%" width="160%" height="500%"><feGaussianBlur stdDeviation="2.2"/></filter>`);

  const tile = bleed
    ? // Full bleed: the rim is drawn by the launcher's own mask, not by us.
      `<rect width="64" height="64" fill="${BRAND_TILE}"/>`
    : small
      ? `<rect x="1" y="1" width="62" height="62" rx="15" fill="${BRAND_TILE}" stroke="url(#${id}-rim)" stroke-width="2"/>`
      : `<rect x="0.5" y="0.5" width="63" height="63" rx="16" fill="${BRAND_TILE}" stroke="url(#${id}-rim)"/>`;

  // Maskable safe zone: an 80% circle in the middle. The glyph is scaled to 80% about the centre.
  const body = bleed ? `<g transform="translate(6.4 6.4) scale(0.8)">${glyph}</g>` : glyph;

  const dims = size ? ` width="${size}" height="${size}"` : "";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"${dims} role="img" aria-label="BACulator">` +
    `<defs>${defs}</defs>${tile}${body}</svg>`
  );
}

/** `data:` URL of the mark, for `<link rel="icon">`. */
export function brandMarkDataUrl(tone: BrandTone, opts: BrandMarkSvgOptions = {}): string {
  return `data:image/svg+xml,${encodeURIComponent(brandMarkSvg(tone, opts))}`;
}

/**
 * The BACulator mark: the estimate's own range strip (a likely-range band with the point marked)
 * on a dark glass tile. It stands in for the wordmark in the app's top bar; the name stays in its
 * accessible label.
 */
export function BrandMark({ size = 40, title = "BACulator" }: { size?: number; title?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={title} className="shrink-0">
      <defs>
        <linearGradient id="bm-rim" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.38" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.05" />
          <stop offset="1" stopColor="#fff" stopOpacity="0.16" />
        </linearGradient>
        <filter id="bm-glow" x="-30%" y="-200%" width="160%" height="500%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
      </defs>
      <rect x="0.5" y="0.5" width="63" height="63" rx="16" fill="#111114" stroke="url(#bm-rim)" />
      <rect x="11" y="30" width="42" height="4" rx="2" fill="#fff" fillOpacity="0.14" />
      <rect x="21" y="29" width="25" height="6" rx="3" fill="#7cb4ff" filter="url(#bm-glow)" opacity="0.8" />
      <rect x="21" y="29.5" width="25" height="5" rx="2.5" fill="#7cb4ff" />
      <rect x="29" y="20" width="4" height="24" rx="2" fill="#fafafa" />
    </svg>
  );
}

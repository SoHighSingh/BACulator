import { House, UserRound } from "lucide-react";

const TILE = (children: React.ReactNode) => (
  <>
    <defs>
      <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity="0.38" />
        <stop offset="0.5" stopColor="#fff" stopOpacity="0.05" />
        <stop offset="1" stopColor="#fff" stopOpacity="0.16" />
      </linearGradient>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="2.4" />
      </filter>
    </defs>
    <rect x="0.5" y="0.5" width="63" height="63" rx="16" fill="#111114" stroke="url(#rim)" />
    {children}
  </>
);

/** Logo candidates. Each is drawn on the same 64-unit glass tile. */
const MARKS: { id: string; name: string; note: string; svg: React.ReactNode }[] = [
  {
    id: "errorbar",
    name: "A · Error bar",
    note: "The literal error bar: a white I-beam (the range) with the estimate as a glowing dot. Ties to “with error bars”.",
    svg: TILE(
      <>
        <rect x="22" y="14" width="20" height="4" rx="2" fill="#fafafa" />
        <rect x="30" y="14" width="4" height="36" rx="2" fill="#fafafa" />
        <rect x="22" y="46" width="20" height="4" rx="2" fill="#fafafa" />
        <circle cx="32" cy="30" r="7" fill="#7cb4ff" filter="url(#glow)" opacity="0.9" />
        <circle cx="32" cy="30" r="6" fill="#7cb4ff" stroke="#111114" strokeWidth="2.5" />
      </>,
    ),
  },
  {
    id: "interval",
    name: "B · Interval",
    note: "Interval notation [ • ]: two brackets hold the likely range, the dot is you. Calm and typographic.",
    svg: TILE(
      <>
        <path d="M22 16h-6v32h6" fill="none" stroke="#fafafa" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M42 16h6v32h-6" fill="none" stroke="#fafafa" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="32" cy="32" r="7" fill="#7cb4ff" filter="url(#glow)" opacity="0.9" />
        <circle cx="32" cy="32" r="6" fill="#7cb4ff" />
      </>,
    ),
  },
  {
    id: "b",
    name: "C · b monogram",
    note: "A lowercase b whose bowl is the range: the stem in white, the bowl lit blue where the estimate sits.",
    svg: TILE(
      <>
        <rect x="18" y="12" width="5" height="40" rx="2.5" fill="#fafafa" />
        <circle cx="34" cy="38" r="12" fill="none" stroke="#fafafa" strokeWidth="5" />
        <path d="M34 26a12 12 0 0 1 12 12" fill="none" stroke="#7cb4ff" strokeWidth="5" strokeLinecap="round" filter="url(#glow)" />
        <path d="M34 26a12 12 0 0 1 12 12" fill="none" stroke="#7cb4ff" strokeWidth="5" strokeLinecap="round" />
      </>,
    ),
  },
  {
    id: "curve",
    name: "D · Tonight's curve",
    note: "The night's own shape: a rise, the now dot, and the dashed fall back to zero. The most product-literal.",
    svg: TILE(
      <>
        <path d="M12 46c6 0 8-6 11-12s5-10 9-10" fill="none" stroke="#fafafa" strokeWidth="4" strokeLinecap="round" />
        <path d="M32 24c6 0 10 8 20 22" fill="none" stroke="#7cb4ff" strokeWidth="4" strokeDasharray="1 7" strokeLinecap="round" />
        <circle cx="32" cy="24" r="6" fill="#7cb4ff" filter="url(#glow)" opacity="0.9" />
        <circle cx="32" cy="24" r="5" fill="#fafafa" />
      </>,
    ),
  },
  {
    id: "range",
    name: "E · Range bar (current)",
    note: "The current mark, for comparison: at 40px it reads as a plus sign.",
    svg: TILE(
      <>
        <rect x="11" y="30" width="42" height="4" rx="2" fill="#fff" fillOpacity="0.14" />
        <rect x="21" y="29.5" width="25" height="5" rx="2.5" fill="#7cb4ff" />
        <rect x="29" y="20" width="4" height="24" rx="2" fill="#fafafa" />
      </>,
    ),
  },
];

/** Round 2: drink-coded. */
const DRINK_MARKS: { id: string; name: string; note: string; svg: React.ReactNode }[] = [
  {
    id: "drop-range",
    name: "F · Drop + range",
    note: "A drop of alcohol, outlined in white, carrying the estimate's range: blue band, white tick for now.",
    svg: TILE(
      <>
        <path d="M32 9C32 9 17 27 17 38a15 15 0 0 0 30 0C47 27 32 9 32 9Z" fill="none" stroke="#fafafa" strokeWidth="3.5" strokeLinejoin="round" />
        <rect x="23" y="36" width="18" height="5" rx="2.5" fill="#7cb4ff" filter="url(#glow)" opacity="0.9" />
        <rect x="23" y="36" width="18" height="5" rx="2.5" fill="#7cb4ff" />
        <rect x="29.5" y="31" width="3" height="15" rx="1.5" fill="#fafafa" />
      </>,
    ),
  },
  {
    id: "drop-fill",
    name: "G · Filling drop",
    note: "The drop is the gauge: blue fills it to tonight's level, a white line marks now. Simplest at 24px.",
    svg: TILE(
      <>
        <defs>
          <clipPath id="dropclip">
            <path d="M32 9C32 9 17 27 17 38a15 15 0 0 0 30 0C47 27 32 9 32 9Z" />
          </clipPath>
        </defs>
        <g clipPath="url(#dropclip)">
          <rect x="10" y="34" width="44" height="30" fill="#7cb4ff" />
          <rect x="10" y="33" width="44" height="3" fill="#fafafa" />
        </g>
        <path d="M32 9C32 9 17 27 17 38a15 15 0 0 0 30 0C47 27 32 9 32 9Z" fill="none" stroke="#fafafa" strokeWidth="3.5" strokeLinejoin="round" />
      </>,
    ),
  },
  {
    id: "bottle",
    name: "H · Bottle label",
    note: "A bottle whose label is the range bar. Most obviously about drinks; a little literal.",
    svg: TILE(
      <>
        <path d="M28 8h8v10c0 3 8 6 8 13v21a4 4 0 0 1-4 4H24a4 4 0 0 1-4-4V31c0-7 8-10 8-13Z" fill="none" stroke="#fafafa" strokeWidth="3.5" strokeLinejoin="round" />
        <rect x="20" y="36" width="24" height="10" fill="#7cb4ff" opacity="0.25" />
        <rect x="23" y="39" width="18" height="4" rx="2" fill="#7cb4ff" />
        <rect x="30" y="35" width="3" height="12" rx="1.5" fill="#fafafa" />
      </>,
    ),
  },
  {
    id: "glass",
    name: "I · Glass level",
    note: "A tumbler with its level lit blue and the meniscus in white: the night's level, read off a glass.",
    svg: TILE(
      <>
        <defs>
          <clipPath id="glassclip">
            <path d="M16 14h32l-4 38a4 4 0 0 1-4 4H24a4 4 0 0 1-4-4Z" />
          </clipPath>
        </defs>
        <g clipPath="url(#glassclip)">
          <rect x="10" y="34" width="44" height="30" fill="#7cb4ff" opacity="0.9" />
          <rect x="10" y="32.5" width="44" height="3" fill="#fafafa" />
        </g>
        <path d="M16 14h32l-4 38a4 4 0 0 1-4 4H24a4 4 0 0 1-4-4Z" fill="none" stroke="#fafafa" strokeWidth="3.5" strokeLinejoin="round" />
      </>,
    ),
  },
  {
    id: "bracket-drop",
    name: "J · Drop in brackets",
    note: "Interval brackets holding a blue drop: the drink, and the honest range around it.",
    svg: TILE(
      <>
        <path d="M20 14h-6v36h6" fill="none" stroke="#fafafa" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M44 14h6v36h-6" fill="none" stroke="#fafafa" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M32 19C32 19 23 30 23 36a9 9 0 0 0 18 0C41 30 32 19 32 19Z" fill="#7cb4ff" filter="url(#glow)" opacity="0.8" />
        <path d="M32 19C32 19 23 30 23 36a9 9 0 0 0 18 0C41 30 32 19 32 19Z" fill="#7cb4ff" />
      </>,
    ),
  },
];

export default function Page() {
  return (
    <main className="min-h-svh bg-black px-6 py-8 text-ink">
      <h1 className="text-[28px] font-semibold tracking-[-0.03em]">Logo round 2: drink-coded</h1>
      <p className="mt-1 text-lg text-ink-2">Each mark at app-icon size, at 64, in the real top bar at 40, and as a 24px favicon.</p>
      <div className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(340px,1fr))] gap-6">
        {[...DRINK_MARKS, ...MARKS.slice(0, 2)].map((m) => (
          <section key={m.id} className="card flex flex-col gap-4 p-5">
            <h2 className="text-lg font-semibold">{m.name}</h2>
            <p className="min-h-20 text-base text-ink-2">{m.note}</p>
            <div className="flex items-end gap-5">
              <svg width={128} height={128} viewBox="0 0 64 64" aria-label={m.name}>
                {m.svg}
              </svg>
              <svg width={64} height={64} viewBox="0 0 64 64" aria-hidden="true">
                {m.svg}
              </svg>
              <svg width={24} height={24} viewBox="0 0 64 64" aria-hidden="true">
                {m.svg}
              </svg>
            </div>
            <div className="glass relative flex items-center gap-1 rounded-2xl py-1.5 pr-1.5 pl-2">
              <svg width={40} height={40} viewBox="0 0 64 64" aria-hidden="true" className="flex-1">
                {m.svg}
              </svg>
              <span className="grid size-12 place-items-center">
                <House aria-hidden="true" className="size-6" strokeWidth={2} />
              </span>
              <span className="grid size-12 place-items-center">
                <UserRound aria-hidden="true" className="size-6" strokeWidth={2} />
              </span>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}

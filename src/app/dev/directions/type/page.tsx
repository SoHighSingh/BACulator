import { Archivo, Funnel_Display, Funnel_Sans, Geist, Host_Grotesk, Instrument_Serif } from "next/font/google";

import { TypeLab, type Face } from "./TypeLab";

const geist = Geist({ subsets: ["latin"], variable: "--t-geist" });
const host = Host_Grotesk({ subsets: ["latin"], variable: "--t-host" });
const archivo = Archivo({ subsets: ["latin"], variable: "--t-archivo", axes: ["wdth"] });
const funnelD = Funnel_Display({ subsets: ["latin"], variable: "--t-funnel-d" });
const funnelS = Funnel_Sans({ subsets: ["latin"], variable: "--t-funnel-s" });
const instrument = Instrument_Serif({ subsets: ["latin"], variable: "--t-instrument", weight: "400" });

// Fontshare faces (ITF Free Font License: free for commercial web and app use) come from their CSS
// API on this dev page only; the chosen one would be self-hosted.
// One stylesheet per family: the API returns only the first family of a combined request.
const FONTSHARE = ["switzer@400,500,600", "general-sans@400,500,600", "satoshi@400,500,700"].map(
  (f) => `https://api.fontshare.com/v2/css?f[]=${f}&display=swap`,
);

const FACES: Face[] = [
  { id: "switzer", name: "Switzer", note: "Fontshare. Neo-grotesk in the Helvetica line, very even.", text: "'Switzer'", display: "'Switzer'", numWeight: 400 },
  { id: "general", name: "General Sans", note: "Fontshare. Grotesk with sharper terminals.", text: "'General Sans'", display: "'General Sans'", numWeight: 400 },
  { id: "satoshi", name: "Satoshi", note: "Fontshare. Geometric-modernist, softer.", text: "'Satoshi'", display: "'Satoshi'", numWeight: 500 },
  { id: "host", name: "Host Grotesk", note: "Google. Contemporary grotesk, tight and clean.", text: "var(--t-host)", display: "var(--t-host)", numWeight: 400 },
  { id: "archivo", name: "Archivo, semi-expanded", note: "Google. Grotesk with a width axis; wider numerals.", text: "var(--t-archivo)", display: "var(--t-archivo)", numWeight: 400, stretch: "112%" },
  { id: "funnel", name: "Funnel Display + Sans", note: "Google. A display cut paired with its text cut.", text: "var(--t-funnel-s)", display: "var(--t-funnel-d)", numWeight: 400 },
  { id: "serif", name: "Instrument Serif + Switzer", note: "Serif for the number and headlines, Switzer for everything you tap.", text: "'Switzer'", display: "var(--t-instrument)", numWeight: 400, serif: true },
  { id: "geist", name: "Geist (current), refined", note: "Control: the current face in the new treatment.", text: "var(--t-geist)", display: "var(--t-geist)", numWeight: 400 },
];

export default function Page() {
  const vars = [geist, host, archivo, funnelD, funnelS, instrument].map((f) => f.variable).join(" ");
  return (
    <>
      {FONTSHARE.map((href) => (
        <link key={href} rel="stylesheet" href={href} precedence="default" />
      ))}
      <div className={vars}>
        <TypeLab faces={FACES} />
      </div>
    </>
  );
}

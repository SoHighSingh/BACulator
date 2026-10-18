import { Hanken_Grotesk, Mona_Sans, Onest, Schibsted_Grotesk } from "next/font/google";

import { Mark, type MarkId } from "./Marks";

const hanken = Hanken_Grotesk({ subsets: ["latin"], variable: "--a-clinical" });
const mona = Mona_Sans({ subsets: ["latin"], variable: "--a-dial", axes: ["wdth"] });
const schibsted = Schibsted_Grotesk({ subsets: ["latin"], variable: "--a-forecast" });
const onest = Onest({ subsets: ["latin"], variable: "--a-native" });

interface Og {
  id: MarkId;
  name: string;
  bg: string;
  ink: string;
  ink2: string;
  accent: string;
  line: string;
  stretch?: string;
}

const OG: Og[] = [
  { id: "clinical", name: "Result", bg: "#EEF1F3", ink: "#0C0E10", ink2: "#48525A", accent: "#1F6FD1", line: "Blood alcohol, with error bars." },
  { id: "dial", name: "Night dial", bg: "#0B0B0C", ink: "#EEE9E0", ink2: "#B5AFA5", accent: "#FF8F3F", line: "Your night, read like a watch.", stretch: "118%" },
  { id: "forecast", name: "Forecast", bg: "#F3F4F6", ink: "#0E1116", ink2: "#4A5260", accent: "#5B8DEF", line: "Tonight, drawn honestly." },
  { id: "native", name: "Health card", bg: "#0A0A0B", ink: "#F2F2F7", ink2: "#AEAEB2", accent: "#F5B946", line: "Know roughly where you stand." },
];

/** Dev-only: app icon and OG image proposals per direction. Each OG frame is exactly 1200 × 630. */
export default function Page() {
  return (
    <main className={`${hanken.variable} ${mona.variable} ${schibsted.variable} ${onest.variable} mx-auto max-w-[1300px] px-6 py-10 text-ink`}>
      <h1 className="text-3xl font-bold">Icons and share images</h1>
      {OG.map((o) => (
        <section key={o.id} className="mt-12">
          <h2 className="text-2xl font-bold">{o.name}</h2>
          <div className="mt-4 flex items-end gap-6">
            <Mark id={o.id} size={180} />
            <Mark id={o.id} size={96} />
            <Mark id={o.id} size={48} />
            <Mark id={o.id} size={32} />
          </div>
          <div
            id={`og-${o.id}`}
            className="mt-6 flex overflow-hidden"
            style={{ width: 1200, height: 630, background: o.bg, color: o.ink, fontFamily: `var(--a-${o.id})`, fontStretch: o.stretch }}
          >
            <div className="flex flex-1 flex-col justify-between p-[72px]">
              <p className="flex items-center gap-4 text-[34px] font-bold tracking-[-0.02em]">
                <Mark id={o.id} size={64} />
                BACulator
              </p>
              <p className="text-[84px] leading-[0.95] font-bold tracking-[-0.045em]">{o.line}</p>
              <p className="text-[28px] font-medium" style={{ color: o.ink2 }}>
                Free blood alcohol &amp; standard drinks calculator. Estimate only.
              </p>
            </div>
            <div className="flex w-[380px] flex-col justify-center gap-3 pr-[72px]">
              <p className="text-[30px] font-semibold" style={{ color: o.ink2 }}>
                Sample night
              </p>
              <p className="flex items-baseline gap-3">
                <span className="text-[34px] font-semibold">about</span>
                <span className="text-[112px] leading-none font-bold tracking-[-0.045em]">0.08</span>
              </p>
              <p className="text-[32px] font-semibold">Likely 0.06 to 0.11</p>
            </div>
          </div>
        </section>
      ))}
    </main>
  );
}

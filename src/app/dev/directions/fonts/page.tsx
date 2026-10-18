import { Figtree, Geist, Hanken_Grotesk, Hubot_Sans, Mona_Sans, Onest, Schibsted_Grotesk } from "next/font/google";

import { FontBench } from "./FontBench";

const geist = Geist({ subsets: ["latin"], variable: "--f-geist" });
const hanken = Hanken_Grotesk({ subsets: ["latin"], variable: "--f-hanken" });
const mona = Mona_Sans({ subsets: ["latin"], variable: "--f-mona", axes: ["wdth"] });
const hubot = Hubot_Sans({ subsets: ["latin"], variable: "--f-hubot", axes: ["wdth"] });
const schibsted = Schibsted_Grotesk({ subsets: ["latin"], variable: "--f-schibsted" });
const onest = Onest({ subsets: ["latin"], variable: "--f-onest" });
const figtree = Figtree({ subsets: ["latin"], variable: "--f-figtree" });

const FACES = [
  { name: "Geist (current)", v: "--f-geist" },
  { name: "Hanken Grotesk", v: "--f-hanken" },
  { name: "Mona Sans", v: "--f-mona" },
  { name: "Mona Sans, expanded 120", v: "--f-mona", stretch: "120%" },
  { name: "Hubot Sans", v: "--f-hubot" },
  { name: "Schibsted Grotesk", v: "--f-schibsted" },
  { name: "Onest", v: "--f-onest" },
  { name: "Figtree", v: "--f-figtree" },
];

export default function Page() {
  const vars = [geist, hanken, mona, hubot, schibsted, onest, figtree].map((f) => f.variable).join(" ");
  return (
    <div className={vars}>
      <FontBench faces={FACES} />
    </div>
  );
}

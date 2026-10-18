import { Mona_Sans } from "next/font/google";

import "./dial.css";

// Mona Sans has a width axis: the dial numerals and headings run expanded (like a chronograph's
// numerals), body copy stays at normal width.
const mona = Mona_Sans({ subsets: ["latin"], variable: "--font-dial", axes: ["wdth"], display: "swap" });

export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className={`${mona.variable} dir-dial`}>{children}</div>;
}

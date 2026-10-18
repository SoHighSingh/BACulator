import { Onest } from "next/font/google";

import "./native.css";

// Onest: the open face closest to SF Pro's proportions and rhythm, so a SwiftUI port swaps it for
// the system font without the layout moving.
const onest = Onest({ subsets: ["latin"], weight: ["500", "600", "700", "800"], variable: "--font-native" });

export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className={`${onest.variable} dir-native`}>{children}</div>;
}

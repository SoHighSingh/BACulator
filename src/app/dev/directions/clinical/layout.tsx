import { Hanken_Grotesk } from "next/font/google";

import "./clinical.css";

const hanken = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-clinical", weight: ["500", "600", "700", "800"] });

export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className={`${hanken.variable} dir-clinical`}>{children}</div>;
}

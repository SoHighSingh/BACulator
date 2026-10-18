import { Schibsted_Grotesk } from "next/font/google";

import "./forecast.css";

// One family, used like a newsroom's house face: heavy for the headline figure, semibold for chart notes.
const schibsted = Schibsted_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800", "900"],
  variable: "--font-forecast",
  display: "swap",
});

export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className={`${schibsted.variable} dir-forecast`}>{children}</div>;
}

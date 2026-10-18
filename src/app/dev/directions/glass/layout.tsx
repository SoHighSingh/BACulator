import "./glass.css";

// Geist (Vercel's face) is already loaded app-wide as --font-geist-sans.
export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className="dir-glass">{children}</div>;
}

import "~/styles/globals.css";
import { type Metadata, type Viewport } from "next";
import { Geist } from "next/font/google";
import { TRPCReactProvider } from "~/trpc/react";
import { SessionProvider } from "next-auth/react";
import UserInfoSlideOutProvider from "../components/UserInfoSlideOutProvider";
import { RegionProvider } from "~/hooks/useRegion";

const SITE_URL = "https://www.baculator.com";
const TITLE = "BACulator — Blood Alcohol & Standard Drinks Calculator";
const DESCRIPTION =
  "Free BAC calculator. Add beers, wine, spirits or cocktails in one tap and estimate your blood alcohol and when it'll be back to zero. An estimate only — not a measure of fitness to drive.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "BACulator",
  appleWebApp: { capable: true, title: "BACulator", statusBarStyle: "black-translucent" },
  alternates: { canonical: "/" },
  icons: [{ rel: "icon", url: "/BACULATROR.png" }],
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "BACulator",
    images: [{ url: "/BACulatorThumbnail.png", width: 1200, height: 630, alt: "BACulator blood alcohol calculator" }],
    locale: "en_US",
    alternateLocale: ["en_AU", "en_GB"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/BACulatorThumbnail.png"],
  },
};

// Pinch-zoom stays enabled: people reading this at night may need it.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#121110",
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "BACulator",
  alternateName: "Blood Alcohol Calculator",
  url: SITE_URL,
  applicationCategory: "HealthApplication",
  operatingSystem: "Any",
  inLanguage: "en",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  description: DESCRIPTION,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable} bg-bg`}>
      <body className="bg-bg text-ink antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <SessionProvider>
          <TRPCReactProvider>
            <RegionProvider>
              <UserInfoSlideOutProvider>{children}</UserInfoSlideOutProvider>
            </RegionProvider>
          </TRPCReactProvider>
        </SessionProvider>
      </body>
    </html>
  );
}

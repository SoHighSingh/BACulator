import "~/styles/globals.css";
import { type Metadata } from "next";
import { Geist } from "next/font/google";
import { TRPCReactProvider } from "~/trpc/react";
import { SessionProvider } from "next-auth/react";
import UserInfoSlideOutProvider from "../components/UserInfoSlideOutProvider";

export const metadata: Metadata = {
  metadataBase: new URL("https://baculator.com"),
  title: "BACulator - The BAC Calculator",
  description: "Advanced Blood Alcohol Content calculator with AI drink recognition, real-time tracking, and scientific pharmacokinetic modeling. Type drinks naturally and get accurate BAC predictions.",
  icons: [{ rel: "icon", url: "/BACULATROR.png" }],
  openGraph: {
    title: "BACulator - The BAC Calculator",
    description: "Advanced Blood Alcohol Content calculator with AI drink recognition, real-time tracking, and scientific pharmacokinetic modeling. Type drinks naturally and get accurate BAC predictions.",
    url: "https://baculator.com", // Replace with your actual domain
    siteName: "BACulator",
    images: [
      {
        url: "/BACulatorThumbnail.png",
        width: 1200,
        height: 630,
        alt: "BACulator - The BAC Calculator",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BACulator - The BAC Calculator",
    description: "Advanced Blood Alcohol Content calculator with AI drink recognition, real-time tracking, and scientific pharmacokinetic modeling.",
    images: ["/BACulatorThumbnail.png"],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable} bg-black`}>
      <body>
        <SessionProvider>
          <TRPCReactProvider>
            <UserInfoSlideOutProvider>
              {children}
            </UserInfoSlideOutProvider>
          </TRPCReactProvider>
        </SessionProvider>
      </body>
    </html>
  );
}

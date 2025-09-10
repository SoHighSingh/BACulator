import "~/styles/globals.css";
import { type Metadata } from "next";
import { Geist } from "next/font/google";
import { TRPCReactProvider } from "~/trpc/react";
import { SessionProvider } from "next-auth/react";
import UserInfoSlideOutProvider from "../components/UserInfoSlideOutProvider";

export const metadata: Metadata = {
  title: "BACulator",
  description: "An intuitive and easy to use BAC calculator",
  icons: [{ rel: "icon", url: "/BACULATROR.png" }],
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

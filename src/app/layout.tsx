import "~/styles/globals.css";
import { type Metadata } from "next";
import { Geist } from "next/font/google";
import { TRPCReactProvider } from "~/trpc/react";
import { UserInfoIcon } from "./_components/UserInfoIcon";
import { SessionProvider } from "next-auth/react";
import UserInfoSlideOutProvider from "./_components/UserInfoSlideOutProvider";

export const metadata: Metadata = {
  title: "BACulator",
  description: "An intuitive and easy to use BAC calculator",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable}`}>
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

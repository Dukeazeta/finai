import type { Metadata, Viewport } from "next";
import { PulseTracker } from "@/components/pulse/pulse-tracker";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "FinAI: a money tracker you can talk to", template: "%s · FinAI" },
  description:
    "Say what you earned and spent, by typing or out loud, and FinAI keeps your books, budgets and dashboard up to date.",
  applicationName: "FinAI",
};

export const viewport: Viewport = {
  themeColor: "#f5f5eb",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" href="/fonts/OTSono-Regular.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/OTSono-Medium.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body className="min-h-dvh">
        {children}
        <PulseTracker />
      </body>
    </html>
  );
}

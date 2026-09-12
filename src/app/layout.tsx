import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://signalpilot-ai.vercel.app"),
  title: {
    default: "SignalPilot AI | AI Market Intelligence",
    template: "%s | SignalPilot AI",
  },
  description:
    "SignalPilot AI provides AI-powered market intelligence, technical analysis, trading signals, confidence scoring and historical performance tracking for Forex, Gold, Crypto and Indices.",
  keywords: [
    "SignalPilot AI",
    "AI market intelligence",
    "AI trading analysis",
    "trading signals",
    "Forex analysis",
    "Gold analysis",
    "Crypto analysis",
    "market analysis",
    "technical analysis",
    "trading intelligence",
  ],
  alternates: {
    canonical: "https://signalpilot-ai.vercel.app",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title: "SignalPilot AI | AI Market Intelligence",
    description:
      "AI-powered market intelligence, technical analysis, trading signals and performance tracking across Forex, Gold, Crypto and Indices.",
    url: "https://signalpilot-ai.vercel.app",
    siteName: "SignalPilot AI",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SignalPilot AI | AI Market Intelligence",
    description:
      "AI-powered market intelligence, technical analysis, trading signals and performance tracking.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}

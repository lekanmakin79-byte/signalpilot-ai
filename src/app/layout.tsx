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
    "SignalPilot AI combines technical analysis, verified fundamental data, four-layer data analytics, signal quality, market ranking and AI-assisted interpretation for Forex and Gold market research.",
  keywords: [
    "SignalPilot AI",
    "AI market intelligence",
    "AI market analysis",
    "AI trading analysis",
    "Forex analysis",
    "Gold analysis",
    "technical analysis",
    "fundamental analysis",
    "data analytics",
    "market intelligence",
    "signal quality",
    "market ranking",
    "opportunity analysis",
    "trading research",
    "quantitative market analysis",
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
      "Technical analysis, verified fundamental data, four-layer data analytics, signal quality, market ranking and AI-assisted market intelligence for Forex and Gold research.",
    url: "https://signalpilot-ai.vercel.app",
    siteName: "SignalPilot AI",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SignalPilot AI | AI Market Intelligence",
    description:
      "AI-powered market intelligence combining technical analysis, fundamental data and four-layer data analytics for market research.",
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
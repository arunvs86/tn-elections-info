import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TN Elections 2026 — Know Your Candidates",
  description:
    "Voter intelligence platform for Tamil Nadu Elections 2026. Live AI investigation of candidates, fact-checking, election history since 2001.",
  keywords: [
    "Tamil Nadu elections 2026",
    "TN elections",
    "candidate profile",
    "fact check",
    "தமிழ்நாடு தேர்தல்",
  ],
  openGraph: {
    title: "tnelections.info — Know your candidates",
    description:
      "Break the narratives. Your vote, your truth. AI-powered voter intelligence for TN 2026.",
    url: "https://tnelections.info",
    siteName: "tnelections.info",
    locale: "ta_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "tnelections.info — TN Elections 2026",
    description: "Know your candidates. Break the narratives.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ta">
      <head>
        {/* Preconnect for Google Fonts performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="bg-cream font-sans antialiased">{children}</body>
    </html>
  );
}

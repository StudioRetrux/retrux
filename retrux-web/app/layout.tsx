import type { Metadata, Viewport } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-sans",
  display: "swap",
});

// Absolute base for the share image and canonical URLs: SITE_URL when set, else the Vercel production URL
// (staging: retrux-staging.vercel.app), else retrux.com (the static export on cPanel).
const SITE_URL =
  process.env.SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "https://retrux.com");
// Staging and other preview hosts stay out of search results; retrux.com is indexed.
const IS_STAGING = /(^|\.)staging\.|\.vercel\.app$/.test(new URL(SITE_URL).hostname);

// Client, 23 Nov: title "Retrux" and this description (verbatim). Share image and icons: Figma 2991:1589 / 2991:1618.
const TITLE = "Retrux";
const DESCRIPTION =
  "Innovative digital studio for humankind. Crafting immersive, interactive, impossibly alive digital experience.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: TITLE,
  creator: "Retrux",
  publisher: "Retrux",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: TITLE,
    title: TITLE,
    description: DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
  // One transparent PNG icon (rendered from the logomark SVG; Figma's PNG export of the mark had the frame's #1E1E1E
  // baked in, which showed as a black box in tabs and WhatsApp). The apple-touch-icon is the white tile (iOS rounds it).
  icons: {
    icon: [{ url: "/favicon.png?v=3", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: { title: TITLE },
  formatDetection: { telephone: false, email: false, address: false },
  robots: IS_STAGING ? { index: false, follow: false } : { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#bccadb",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={spaceGrotesk.variable}>
      <body className="bg-[#bccadb] text-white antialiased">{children}</body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import "./globals.css";

const displayFont = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
});

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700", "800"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://chao-batido--capoeira-17aee.us-central1.hosted.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Capoeira Chão Batido", template: "%s | Chão Batido" },
  description: "Capoeira, cultura e comunidade no Chão Batido.",
  icons: { icon: "/media/logo.webp" },
  openGraph: {
    locale: "pt_BR",
    type: "website",
    siteName: "Chão Batido",
    images: [{ url: "/media/presentation-poster.webp", width: 960, height: 540 }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#151412",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" data-scroll-behavior="smooth" className={`${displayFont.variable} ${bodyFont.variable}`}>
      <body>{children}</body>
    </html>
  );
}

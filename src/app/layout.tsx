import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Cairn — licensed cannabis stores in Canada", template: "%s — Cairn" },
  description: "A directory of provincially licensed cannabis retailers in Canada. See what stores carry and the licence behind each one.",
  robots: { index: process.env.DEMO_MODE !== "true" },
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#e3e6e1" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1f1b" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-CA">
      <body>{children}</body>
    </html>
  );
}

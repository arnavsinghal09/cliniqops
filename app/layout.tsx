import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import "./globals.css";

// Inter = body. Newsreader = serif display for the landing (Tennr-style
// editorial headline). Dashboard headings keep Space Grotesk via font-display
// if you still use it elsewhere — landing uses .font-serif explicitly.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "CliniqOps — Move every patient forward",
  description:
    "One calm view for patient flow, billing, and staffing. Less chasing, fewer no-shows.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${newsreader.variable}`}>
      <body className="relative bg-bg font-sans text-ink antialiased">
        <div className="grain-overlay" aria-hidden />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}

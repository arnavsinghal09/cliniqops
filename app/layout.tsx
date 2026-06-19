import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

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
  title: "CliniqOps · Move every patient forward",
  description:
    "One calm view for patient flow, billing, and staffing. Less chasing, fewer no-shows.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${newsreader.variable}`}>
      <body className="relative bg-bg font-sans text-ink antialiased">
        <div className="grain-overlay" aria-hidden />
        <div className="relative z-10">{children}</div>
        <Toaster
          position="bottom-right"
          toastOptions={{
            unstyled: false,
            classNames: {
              toast:
                "!rounded-sm !border !border-line-2 !border-l-[4px] !border-l-clay !bg-surface !text-ink !shadow-pop !gap-2",
              title: "!text-ink !font-semibold !text-sm !opacity-100",
              description: "!text-ink-2 !opacity-100 !text-xs",
              icon: "!text-clay",
              actionButton: "!bg-brand !text-surface !rounded-sm !text-xs",
              cancelButton: "!bg-sand !text-ink-2 !rounded-sm",
              success: "!border-l-ok",
              error: "!border-l-danger",
            },
          }}
        />
      </body>
    </html>
  );
}

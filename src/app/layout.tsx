import type { Metadata } from "next";
import { Assistant, Heebo } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { he } from "@/lib/i18n/he";

const sans = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-sans",
  display: "swap",
});
const display = Assistant({
  subsets: ["hebrew", "latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: he.meta.title,
  description: he.meta.description,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="he"
      dir="rtl"
      suppressHydrationWarning
      className={`${sans.variable} ${display.variable}`}
    >
      <body className="min-h-screen bg-background font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

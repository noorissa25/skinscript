import type { Metadata, Viewport } from "next";
import { Archivo, Inter } from "next/font/google";
import { brand } from "@/lib/brand";
import { LocaleProvider } from "@/i18n/LocaleProvider";
import { AuthProvider } from "./account/AuthProvider";
import "./globals.css";

// Archivo's width axis covers both the extra-wide hero type and the condensed nav/button type.
const display = Archivo({ variable: "--font-display", subsets: ["latin"], axes: ["wdth"] });
const sans = Inter({ variable: "--font-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: `${brand.name} · Beauty ingredient checker`,
  description:
    "Paste a skincare ingredient list or scan a label. Get plain-language explanations and cited flags for common conflicts and irritants.",
};

export const viewport: Viewport = {
  themeColor: "#D02F6D",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body>
        <LocaleProvider>
          <AuthProvider>{children}</AuthProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Bricolage_Grotesque, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Atkinson Hyperlegible was designed for low-vision readers: right for Dad's screen and calm for Phil's.
const body = Atkinson_Hyperlegible({ variable: "--font-atkinson", subsets: ["latin"], weight: ["400", "700"] });
const display = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], weight: ["500", "700"] });
const mono = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], weight: ["400", "600"] });

export const metadata: Metadata = {
  title: "Dad Care",
  description: "Know Dad is safe at a glance. Help reaches him within minutes when something goes wrong.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { DadApp } from "@/components/dad/DadApp";

export const metadata: Metadata = {
  title: "Dad Care",
  appleWebApp: { capable: true, title: "Dad Care", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#f2f2ee",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // stops accidental pinch-zoom from shaky hands; text is already large
  viewportFit: "cover",
};

export default function DadScreen() {
  return <DadApp />;
}

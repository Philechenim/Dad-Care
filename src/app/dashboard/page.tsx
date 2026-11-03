import type { Metadata } from "next";
import { HouseDashboard } from "@/components/house/HouseDashboard";

export const metadata: Metadata = { title: "Dad Care · Dad's house" };

export default function Dashboard() {
  return <HouseDashboard />;
}

import { Metadata } from "next";
import { PlatformStats } from "@/components/features/winner/platform-stats";
import { HallOfFame } from "@/components/features/winner/hall-of-fame";

export const metadata: Metadata = {
  title: "Winners - Hacka-Fi",
  description:
    "Discover the top performers and winners across all hackathons on Hacka-Fi platform. View prize distributions, achievements, and success stories.",
  keywords: [
    "hackathon winners",
    "blockchain hackathon",
    "crypto prizes",
    "developer achievements",
    "Kaia network",
  ],
  openGraph: {
    title: "Hackathon Winners - Hacka-Fi",
    description:
      "Top performers and prize winners on the premier blockchain hackathon platform",
    type: "website",
  },
};

export default function WinnersPage() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-12">
      <PlatformStats />
      <HallOfFame />
    </div>
  );
}

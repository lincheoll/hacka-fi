import { Metadata } from "next";
import { HallOfFame } from "@/components/features/winner/hall-of-fame";

export const metadata: Metadata = {
  title: "Hall of Fame - Hacka-Fi",
  description:
    "Honor roll of top-performing developers and innovators who have excelled in blockchain hackathons on Hacka-Fi.",
  keywords: [
    "hall of fame",
    "top developers",
    "blockchain winners",
    "hackathon champions",
    "Kaia network builders",
  ],
  openGraph: {
    title: "Hall of Fame - Hacka-Fi",
    description:
      "Celebrating excellence in blockchain development and innovation",
    type: "website",
  },
};

export default function HallOfFamePage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <HallOfFame />
    </div>
  );
}

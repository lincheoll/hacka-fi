"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { PublicHackathon, PublicWinner } from "@/types/public-api";
import { publicApi } from "@/lib/public-api";
import { HackathonShowcase } from "@/components/features/winner/hackathon-showcase";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function HackathonShowcasePage() {
  const params = useParams();
  const hackathonId = params.id as string;

  const [hackathon, setHackathon] = useState<PublicHackathon | null>(null);
  const [winners, setWinners] = useState<PublicWinner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadHackathonData = async () => {
      try {
        setLoading(true);

        // Get completed hackathons to find the specific one
        const hackathonsResponse = await publicApi.getCompletedHackathons({
          limit: 1000,
        });
        const targetHackathon = hackathonsResponse.data.find(
          (h) => h.id === hackathonId,
        );

        if (!targetHackathon) {
          throw new Error("Hackathon not found");
        }

        // Get detailed winners for this hackathon
        const winnersData = await publicApi.getHackathonWinners(hackathonId);

        setHackathon({
          ...targetHackathon,
          winners: winnersData,
        });
        setWinners(winnersData);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load hackathon showcase",
        );
      } finally {
        setLoading(false);
      }
    };

    if (hackathonId) {
      loadHackathonData();
    }
  }, [hackathonId]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="h-8 bg-gray-200 rounded w-32 animate-pulse"></div>

          <div className="animate-pulse">
            <div className="h-48 bg-gray-200 rounded mb-6"></div>
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !hackathon) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Hackathon Not Found
          </h1>
          <p className="text-gray-600 mb-6">
            {error ||
              "The requested hackathon could not be found or may not be completed yet."}
          </p>
          <div className="space-x-4">
            <Link href="/hackathons/archive">
              <Button variant="outline">Browse Archive</Button>
            </Link>
            <Link href="/winners">
              <Button>View Winners</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/hackathons/archive">
          <Button variant="outline" className="mb-4">
            <ChevronLeft className="w-4 h-4 mr-2" />
            Back to Archive
          </Button>
        </Link>
      </div>

      <HackathonShowcase hackathon={hackathon} showAllWinners={true} />
    </div>
  );
}

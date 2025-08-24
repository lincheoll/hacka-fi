"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/header";
import { HackathonList } from "@/components/features/hackathon/hackathon-list";

export default function HackathonsPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container px-4 py-8 mx-auto">
          <div className="space-y-6 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="w-1/3 h-8 bg-gray-200 rounded"></div>
              <div className="w-32 h-10 bg-gray-200 rounded"></div>
            </div>
            <div className="w-1/2 h-4 bg-gray-200 rounded"></div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container px-4 py-8 mx-auto">
        {/* Page Header */}
        <div className="flex flex-col items-start justify-between mb-8 sm:flex-row sm:items-center">
          <div>
            <h1 className="mb-2 text-3xl font-bold text-gray-900">
              Hackathons
            </h1>
            <p className="text-gray-600">
              Discover and join blockchain hackathons with transparent voting
              and automated prizes
            </p>
          </div>
          <Button asChild className="mt-4 sm:mt-0">
            <Link href="/hackathons/create">Create Hackathon</Link>
          </Button>
        </div>

        {/* Hackathon List */}
        <HackathonList />
      </div>
    </div>
  );
}

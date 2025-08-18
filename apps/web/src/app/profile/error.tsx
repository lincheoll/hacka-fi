"use client";

import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ProfileError({ error, reset }: ErrorProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <h2 className="text-2xl font-bold text-red-600 mb-4">
            Failed to load profile
          </h2>
          <p className="text-gray-600 mb-6 text-center max-w-md">
            {error.message || "Something went wrong while loading the profile."}
          </p>
          <Button onClick={reset}>Try again</Button>
        </div>
      </div>
    </div>
  );
}

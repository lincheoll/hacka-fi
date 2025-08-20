"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { Header } from "@/components/layout/header";
import { JudgeDashboard } from "@/components/features/judge";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Note: This would be better handled with Next.js middleware in a production app
export default function JudgeDashboardPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container px-4 py-8 mx-auto">
          <div className="animate-pulse">
            <div className="w-1/3 h-8 mb-4 bg-gray-200 rounded"></div>
            <div className="space-y-4">
              <div className="h-32 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <JudgePageContent />;
}

function JudgePageContent() {
  const { address: walletAddress, isConnected } = useAccount();

  if (!isConnected || !walletAddress) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container px-4 py-8 mx-auto">
          <h1 className="mb-8 text-3xl font-bold text-gray-900">
            Judge Dashboard
          </h1>
          <Alert>
            <AlertDescription>
              Please connect your wallet to access the Judge Dashboard.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container px-4 py-8 mx-auto">
        <JudgeDashboard />
      </div>
    </div>
  );
}

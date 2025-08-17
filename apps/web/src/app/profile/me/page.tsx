'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Header } from "@/components/layout/header";
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function MyProfilePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return <MyProfileContent />;
}

function MyProfileContent() {
  const { address, isConnected } = useAccount();

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Profile</h1>
        {isConnected ? (
          <div>
            <p className="text-gray-600 mb-4">
              Connected wallet: {address}
            </p>
            <p className="text-gray-600">
              Your profile details will be displayed here.
            </p>
          </div>
        ) : (
          <Alert>
            <AlertDescription>
              Please connect your wallet to view your profile.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}

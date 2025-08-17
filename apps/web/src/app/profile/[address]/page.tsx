'use client';
export const dynamic = 'force-dynamic';

import { use, useState, useEffect } from 'react';
import { Header } from "@/components/layout/header";

interface UserProfilePageProps {
  params: Promise<{ address: string }>;
}

export default function UserProfilePage({
  params,
}: UserProfilePageProps) {
  const { address } = use(params);
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">User Profile</h1>
        <p className="text-gray-600">
          Profile for {address} will be displayed here.
        </p>
      </div>
    </div>
  );
}

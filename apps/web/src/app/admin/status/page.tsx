"use client";

import { Header } from "@/components/layout/header";
import { StatusDashboard } from "@/components/features/hackathon/status-dashboard";

export default function AdminStatusPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />

      <div className="container mx-auto px-4 py-8">
        <StatusDashboard />
      </div>
    </div>
  );
}

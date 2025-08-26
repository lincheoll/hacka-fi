"use client";

export const dynamic = "force-dynamic";

import { StatusDashboard } from "@/components/features/hackathon/status-dashboard";

export default function AdminStatusPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          Hackathon Status Management
        </h1>
        <p className="text-gray-600">
          Monitor and manually update hackathon statuses across the platform
        </p>
      </div>

      <StatusDashboard />
    </div>
  );
}

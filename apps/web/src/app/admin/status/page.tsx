"use client";

import { Header } from "@/components/layout/header";
import { StatusDashboard } from "@/components/features/hackathon/status-dashboard";

export default function AdminStatusPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="container px-4 py-8 mx-auto">
        <StatusDashboard />
      </div>
    </div>
  );
}

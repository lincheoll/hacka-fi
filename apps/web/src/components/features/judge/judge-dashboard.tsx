"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AssignedHackathons } from "./assigned-hackathons";
import { VotingProgressCard } from "./voting-progress-card";
import { JudgeStatistics } from "./judge-statistics";
import { DeadlineNotifications } from "./deadline-notifications";
import {
  fetchJudgeAssignedHackathons,
  fetchJudgeVotingStatistics,
  type JudgeDashboardData,
  type JudgeVotingStatistics,
} from "@/lib/api-functions";

// Use types from api-functions

export function JudgeDashboard() {
  const { address: judgeAddress } = useAccount();
  const [dashboardData, setDashboardData] = useState<JudgeDashboardData | null>(
    null,
  );
  const [statistics, setStatistics] = useState<JudgeVotingStatistics | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<
    "all" | "pending" | "completed" | "overdue"
  >("all");

  useEffect(() => {
    if (judgeAddress) {
      fetchDashboardData();
      fetchStatistics();
    }
  }, [judgeAddress]);

  const fetchDashboardData = async () => {
    if (!judgeAddress) return;

    try {
      const data = await fetchJudgeAssignedHackathons(judgeAddress);
      setDashboardData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    }
  };

  const fetchStatistics = async () => {
    if (!judgeAddress) return;

    try {
      const data = await fetchJudgeVotingStatistics(judgeAddress);
      setStatistics(data);
    } catch (err) {
      console.error("Failed to fetch statistics:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-32 h-32 border-b-2 rounded-full animate-spin border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-destructive">Error: {error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!dashboardData) {
    return (
      <Card>
        <CardContent className="p-6">
          <p>No dashboard data available</p>
        </CardContent>
      </Card>
    );
  }

  const filteredHackathons = dashboardData.assignedHackathons.filter(
    (assignment) => {
      switch (activeFilter) {
        case "pending":
          return assignment.votingProgress.pendingVotes > 0;
        case "completed":
          return assignment.votingProgress.pendingVotes === 0;
        case "overdue":
          return assignment.isOverdue;
        default:
          return true;
      }
    },
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Judge Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your hackathon judging assignments and track voting progress
          </p>
        </div>
        <Badge variant="secondary">
          {dashboardData.totalAssigned} Total Assignments
        </Badge>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Total Assigned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData.totalAssigned}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending Votes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData.pendingHackathons}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardData.completedHackathons}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg. Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statistics?.averageScore
                ? statistics.averageScore.toFixed(1)
                : "N/A"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Deadline Notifications */}
      <DeadlineNotifications assignments={dashboardData.assignedHackathons} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Assigned Hackathons */}
        <div className="lg:col-span-2">
          <AssignedHackathons
            assignments={filteredHackathons}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            onRefresh={fetchDashboardData}
          />
        </div>

        {/* Side Panel */}
        <div className="space-y-6">
          {/* Voting Progress Summary */}
          <VotingProgressCard assignments={dashboardData.assignedHackathons} />

          {/* Statistics */}
          {statistics && <JudgeStatistics statistics={statistics} />}
        </div>
      </div>
    </div>
  );
}

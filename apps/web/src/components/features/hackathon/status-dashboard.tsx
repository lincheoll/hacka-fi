"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, Activity } from "lucide-react";
import {
  getStatusSummary,
  triggerStatusCheck,
  getAuditStatistics,
} from "@/lib/api-functions";

export function StatusDashboard() {
  // Fetch status summary
  const {
    data: statusSummary,
    isLoading: isLoadingSummary,
    error: summaryError,
    refetch: refetchSummary,
  } = useQuery({
    queryKey: ["status-summary"],
    queryFn: getStatusSummary,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch audit statistics
  const {
    data: auditStats,
    isLoading: isLoadingStats,
    error: statsError,
  } = useQuery({
    queryKey: ["audit-statistics"],
    queryFn: getAuditStatistics,
    refetchInterval: 60000, // Refetch every minute
  });

  const handleManualCheck = async () => {
    try {
      const result = await triggerStatusCheck();
      console.log("Manual status check result:", result);
      alert(
        `Status check completed! Processed ${result.processedCount} hackathons, updated ${result.updatedCount}.`,
      );
      refetchSummary(); // Refresh data after manual check
    } catch (error) {
      console.error("Manual status check failed:", error);
      alert("Manual status check failed. Please try again.");
    }
  };

  if (isLoadingSummary || isLoadingStats) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (summaryError || statsError) {
    return (
      <Alert className="border-red-500 bg-red-50">
        <AlertDescription className="text-red-700">
          Failed to load status dashboard:{" "}
          {summaryError?.message || statsError?.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Manual Check Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Status Dashboard
          </h2>
          <p className="text-muted-foreground">
            Monitor hackathon statuses and system activity
          </p>
        </div>
        <Button onClick={handleManualCheck} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Trigger Status Check
        </Button>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Hackathons
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statusSummary?.activeHackathonsCount || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Hackathons with automatic monitoring
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Audit Logs
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {auditStats?.totalLogs || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Status changes tracked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Most Common Status
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statusSummary?.currentStatus || "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              Current dominant status
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Counts */}
      <Card>
        <CardHeader>
          <CardTitle>Status Distribution</CardTitle>
          <CardDescription>
            Current status breakdown across all hackathons
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statusSummary?.statusCounts &&
              Object.entries(statusSummary.statusCounts).map(
                ([status, count]) => (
                  <div key={status} className="text-center">
                    <Badge variant="outline" className="mb-2">
                      {status.replace(/_/g, " ")}
                    </Badge>
                    <div className="text-2xl font-bold">{count}</div>
                  </div>
                ),
              )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Changes */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Status Changes</CardTitle>
          <CardDescription>Latest automatic status transitions</CardDescription>
        </CardHeader>
        <CardContent>
          {statusSummary?.recentChanges &&
          statusSummary.recentChanges.length > 0 ? (
            <div className="space-y-3">
              {statusSummary.recentChanges.map((change, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <div className="font-medium text-sm">
                      {change.hackathonId.slice(0, 8)}...
                    </div>
                    <div className="text-xs text-gray-500">
                      {change.fromStatus} → {change.toStatus}
                    </div>
                    <div className="text-xs text-gray-400">{change.reason}</div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(change.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-4">
              No recent status changes
            </p>
          )}
        </CardContent>
      </Card>

      {/* Audit Log Summary */}
      {auditStats && (
        <Card>
          <CardHeader>
            <CardTitle>Audit Log Statistics</CardTitle>
            <CardDescription>
              Activity breakdown by action type and trigger
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">By Action Type</h4>
                <div className="space-y-2">
                  {Object.entries(auditStats.logsByAction).map(
                    ([action, count]) => (
                      <div key={action} className="flex justify-between">
                        <span className="text-sm">
                          {action.replace(/_/g, " ")}
                        </span>
                        <span className="text-sm font-medium">{count}</span>
                      </div>
                    ),
                  )}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-3">By Trigger Type</h4>
                <div className="space-y-2">
                  {Object.entries(auditStats.logsByTrigger).map(
                    ([trigger, count]) => (
                      <div key={trigger} className="flex justify-between">
                        <span className="text-sm">{trigger}</span>
                        <span className="text-sm font-medium">{count}</span>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

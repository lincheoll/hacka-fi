"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Clock,
  Users,
  Vote,
  Calendar,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Settings,
  TrendingUp,
} from "lucide-react";
import {
  getVotingPeriodInfo,
  getVotingPhaseHackathons,
  triggerStatusCheck,
} from "@/lib/api-functions";
import type { VotingPeriodInfo, VotingPhaseHackathon } from "@/types/api";
import { useToast } from "@/hooks/use-toast";
import React from "react";

interface VotingPeriodManagementProps {
  hackathonId?: string;
  isAdmin?: boolean;
}

export function VotingPeriodManagement({
  hackathonId,
  isAdmin = false,
}: VotingPeriodManagementProps) {
  const [votingInfo, setVotingInfo] = useState<VotingPeriodInfo | null>(null);
  const [allVotingHackathons, setAllVotingHackathons] = useState<
    VotingPhaseHackathon[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  // Load voting period info for specific hackathon
  const loadVotingInfo = useCallback(async () => {
    if (!hackathonId) return;

    setIsLoading(true);
    try {
      const info = await getVotingPeriodInfo(hackathonId);
      setVotingInfo(info);
    } catch (error) {
      toast({
        title: "Failed to Load Voting Info",
        description:
          error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [hackathonId, toast]);

  // Load all hackathons in voting phase
  const loadAllVotingHackathons = useCallback(async () => {
    setIsLoading(true);
    try {
      const hackathons = await getVotingPhaseHackathons();
      setAllVotingHackathons(hackathons);
    } catch (error) {
      toast({
        title: "Failed to Load Voting Hackathons",
        description:
          error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Trigger manual status check
  const handleStatusCheck = async () => {
    if (!isAdmin) {
      toast({
        title: "Unauthorized",
        description: "Only administrators can trigger status checks.",
        variant: "destructive",
      });
      return;
    }

    setIsRefreshing(true);
    try {
      const result = await triggerStatusCheck();
      toast({
        title: "Status Check Complete",
        description: `Processed ${result.processedCount} hackathons, updated ${result.updatedCount}`,
      });

      // Refresh data after status check
      if (hackathonId) {
        await loadVotingInfo();
      } else {
        await loadAllVotingHackathons();
      }
    } catch (error) {
      toast({
        title: "Failed to Check Status",
        description:
          error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Format time remaining
  const formatTimeRemaining = (milliseconds: number): string => {
    if (milliseconds <= 0) return "Ended";

    const days = Math.floor(milliseconds / (24 * 60 * 60 * 1000));
    const hours = Math.floor(
      (milliseconds % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000),
    );
    const minutes = Math.floor((milliseconds % (60 * 60 * 1000)) / (60 * 1000));

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  // Get status badge color
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "VOTING_OPEN":
        return "default";
      case "VOTING_CLOSED":
        return "secondary";
      case "SUBMISSION_CLOSED":
        return "secondary";
      case "COMPLETED":
        return "secondary";
      default:
        return "secondary";
    }
  };

  // Load data on component mount
  useEffect(() => {
    if (hackathonId) {
      loadVotingInfo();
    } else {
      loadAllVotingHackathons();
    }
  }, [hackathonId, loadVotingInfo, loadAllVotingHackathons]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (hackathonId) {
        loadVotingInfo();
      } else {
        loadAllVotingHackathons();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [hackathonId, loadVotingInfo, loadAllVotingHackathons]);

  if (isLoading && !votingInfo && allVotingHackathons.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Vote className="w-5 h-5" />
            Voting Period Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span className="ml-2">Loading voting information...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Admin Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Vote className="w-5 h-5" />
                Voting Period Management
              </CardTitle>
              <CardDescription>
                {hackathonId
                  ? "Monitor and manage voting period for this hackathon"
                  : "Overview of all hackathons in voting phases"}
              </CardDescription>
            </div>
            {isAdmin && (
              <Button
                onClick={handleStatusCheck}
                disabled={isRefreshing}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
                />
                {isRefreshing ? "Checking..." : "Check Status"}
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Specific Hackathon Voting Info */}
      {hackathonId && votingInfo && (
        <>
          {/* Current Status Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Voting Period Status
                <Badge
                  variant={getStatusBadgeVariant(votingInfo.currentStatus)}
                >
                  {votingInfo.currentStatus}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="p-4 text-center border rounded-lg">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                  <div className="text-2xl font-bold">
                    {formatTimeRemaining(votingInfo.votingPeriod.timeRemaining)}
                  </div>
                  <div className="text-sm text-gray-500">Time Remaining</div>
                </div>

                <div className="p-4 text-center border rounded-lg">
                  <Users className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <div className="text-2xl font-bold">
                    {votingInfo.statistics.totalJudges}
                  </div>
                  <div className="text-sm text-gray-500">Total Judges</div>
                </div>

                <div className="p-4 text-center border rounded-lg">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 text-purple-500" />
                  <div className="text-2xl font-bold">
                    {Math.round(votingInfo.statistics.votingParticipation)}%
                  </div>
                  <div className="text-sm text-gray-500">Participation</div>
                </div>

                <div className="p-4 text-center border rounded-lg">
                  <Vote className="w-8 h-8 mx-auto mb-2 text-orange-500" />
                  <div className="text-2xl font-bold">
                    {votingInfo.statistics.totalVotes}
                  </div>
                  <div className="text-sm text-gray-500">Total Votes</div>
                </div>
              </div>

              <Separator className="my-4" />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Voting Period:</span>
                  <span className="text-sm text-gray-500">
                    {new Date(
                      votingInfo.votingPeriod.startTime,
                    ).toLocaleDateString()}{" "}
                    -{" "}
                    {new Date(
                      votingInfo.votingPeriod.endTime,
                    ).toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="font-medium">Status:</span>
                  <div className="flex items-center gap-2">
                    {votingInfo.votingPeriod.isActive ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-yellow-500" />
                    )}
                    <span className="text-sm">
                      {votingInfo.votingPeriod.isActive
                        ? "Active"
                        : votingInfo.votingPeriod.hasEnded
                          ? "Ended"
                          : "Not Started"}
                    </span>
                  </div>
                </div>

                {votingInfo.nextTransition.newStatus && (
                  <Alert>
                    <AlertCircle className="w-4 h-4" />
                    <AlertDescription>
                      Next transition: {votingInfo.currentStatus} →{" "}
                      {votingInfo.nextTransition.newStatus}
                      <br />
                      Reason: {votingInfo.nextTransition.reason}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* All Voting Hackathons Overview */}
      {!hackathonId && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              All Voting Phase Hackathons
            </CardTitle>
            <CardDescription>
              Hackathons currently in voting-related phases
            </CardDescription>
          </CardHeader>
          <CardContent>
            {allVotingHackathons.length === 0 ? (
              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  No hackathons are currently in voting phases.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="space-y-4">
                {allVotingHackathons.map((hackathon) => (
                  <div
                    key={hackathon.id}
                    className="p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{hackathon.title}</h3>
                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                          <Badge
                            variant={getStatusBadgeVariant(hackathon.status)}
                          >
                            {hackathon.status}
                          </Badge>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {hackathon._count.participants} participants
                          </span>
                          <span className="flex items-center gap-1">
                            <Vote className="w-3 h-3" />
                            {hackathon._count.judges} judges
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {formatTimeRemaining(hackathon.timeUntilVotingEnds)}
                        </div>
                        <div className="text-sm text-gray-500">
                          {hackathon.votingParticipation}% participation
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

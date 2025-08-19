"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, AlertCircle } from "lucide-react";
import { type JudgeHackathonAssignment } from "@/lib/api-functions";

interface VotingProgressCardProps {
  assignments: JudgeHackathonAssignment[];
}

export function VotingProgressCard({ assignments }: VotingProgressCardProps) {
  const totalParticipants = assignments.reduce(
    (sum, assignment) => sum + assignment.votingProgress.totalParticipants,
    0,
  );

  const totalCompletedVotes = assignments.reduce(
    (sum, assignment) => sum + assignment.votingProgress.completedVotes,
    0,
  );

  const totalPendingVotes = assignments.reduce(
    (sum, assignment) => sum + assignment.votingProgress.pendingVotes,
    0,
  );

  const overallProgress =
    totalParticipants > 0 ? (totalCompletedVotes / totalParticipants) * 100 : 0;

  const completedHackathons = assignments.filter(
    (a) => a.votingProgress.pendingVotes === 0,
  ).length;

  const overdueHackathons = assignments.filter((a) => a.isOverdue).length;

  const urgentHackathons = assignments.filter(
    (a) =>
      !a.isOverdue &&
      a.daysUntilDeadline <= 2 &&
      a.votingProgress.pendingVotes > 0,
  ).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Voting Progress Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium">Overall Progress</span>
            <span>{overallProgress.toFixed(1)}%</span>
          </div>
          <Progress value={overallProgress} className="h-3" />
          <div className="text-xs text-muted-foreground mt-1">
            {totalCompletedVotes} of {totalParticipants} votes cast
          </div>
        </div>

        {/* Quick Stats */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm">Completed Hackathons</span>
            </div>
            <Badge variant="secondary">{completedHackathons}</Badge>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-600" />
              <span className="text-sm">Urgent (≤ 2 days)</span>
            </div>
            <Badge variant={urgentHackathons > 0 ? "default" : "secondary"}>
              {urgentHackathons}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm">Overdue</span>
            </div>
            <Badge
              variant={overdueHackathons > 0 ? "destructive" : "secondary"}
            >
              {overdueHackathons}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded-full bg-blue-600"></div>
              <span className="text-sm">Total Pending Votes</span>
            </div>
            <Badge variant={totalPendingVotes > 0 ? "default" : "secondary"}>
              {totalPendingVotes}
            </Badge>
          </div>
        </div>

        {/* Priority Breakdown */}
        {assignments.length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-3">Next Actions</h4>
            <div className="space-y-2 text-sm">
              {overdueHackathons > 0 && (
                <div className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-3 w-3" />
                  <span>
                    Address {overdueHackathons} overdue hackathon
                    {overdueHackathons > 1 ? "s" : ""}
                  </span>
                </div>
              )}
              {urgentHackathons > 0 && (
                <div className="flex items-center gap-2 text-orange-600">
                  <Clock className="h-3 w-3" />
                  <span>
                    Complete {urgentHackathons} urgent hackathon
                    {urgentHackathons > 1 ? "s" : ""}
                  </span>
                </div>
              )}
              {totalPendingVotes > 0 &&
                overdueHackathons === 0 &&
                urgentHackathons === 0 && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="h-3 w-3 rounded-full bg-blue-600"></div>
                    <span>Continue with {totalPendingVotes} pending votes</span>
                  </div>
                )}
              {totalPendingVotes === 0 && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-3 w-3" />
                  <span>All voting completed!</span>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

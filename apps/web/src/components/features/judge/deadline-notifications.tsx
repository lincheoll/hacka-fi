"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, Vote, X } from "lucide-react";
import { useState } from "react";
import { type JudgeHackathonAssignment } from "@/lib/api-functions";

interface DeadlineNotificationsProps {
  assignments: JudgeHackathonAssignment[];
}

export function DeadlineNotifications({
  assignments,
}: DeadlineNotificationsProps) {
  const [dismissedNotifications, setDismissedNotifications] = useState<
    string[]
  >([]);

  const overdueAssignments = assignments.filter(
    (a) =>
      a.isOverdue &&
      a.votingProgress.pendingVotes > 0 &&
      !dismissedNotifications.includes(a.hackathon.id),
  );

  const urgentAssignments = assignments.filter(
    (a) =>
      !a.isOverdue &&
      a.daysUntilDeadline <= 2 &&
      a.votingProgress.pendingVotes > 0 &&
      !dismissedNotifications.includes(a.hackathon.id),
  );

  const dismissNotification = (hackathonId: string) => {
    setDismissedNotifications((prev) => [...prev, hackathonId]);
  };

  const formatDeadline = (assignment: JudgeHackathonAssignment) => {
    const date = new Date(assignment.deadline);
    return date.toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (overdueAssignments.length === 0 && urgentAssignments.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* Overdue Notifications */}
      {overdueAssignments.map((assignment) => (
        <Card
          key={assignment.hackathon.id}
          className="border-destructive bg-destructive/5"
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-destructive">
                      Overdue: {assignment.hackathon.title}
                    </h4>
                    <Badge variant="destructive">
                      {Math.abs(assignment.daysUntilDeadline)} days overdue
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {assignment.votingProgress.pendingVotes} votes remaining •
                    Deadline was {formatDeadline(assignment)}
                  </p>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/hackathons/${assignment.hackathon.id}/voting`}
                    >
                      <Button size="sm" variant="destructive">
                        <Vote className="h-4 w-4 mr-2" />
                        Vote Now
                      </Button>
                    </Link>
                    <Link href={`/hackathons/${assignment.hackathon.id}`}>
                      <Button size="sm" variant="outline">
                        View Details
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dismissNotification(assignment.hackathon.id)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Urgent Notifications */}
      {urgentAssignments.map((assignment) => (
        <Card
          key={assignment.hackathon.id}
          className="border-orange-500 bg-orange-50"
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <Clock className="h-5 w-5 text-orange-600 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-orange-800">
                      Deadline Soon: {assignment.hackathon.title}
                    </h4>
                    <Badge
                      variant="outline"
                      className="border-orange-500 text-orange-700"
                    >
                      {assignment.daysUntilDeadline}{" "}
                      {assignment.daysUntilDeadline === 1 ? "day" : "days"} left
                    </Badge>
                  </div>
                  <p className="text-sm text-orange-700 mb-2">
                    {assignment.votingProgress.pendingVotes} votes remaining •
                    Due {formatDeadline(assignment)}
                  </p>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/hackathons/${assignment.hackathon.id}/voting`}
                    >
                      <Button
                        size="sm"
                        className="bg-orange-600 hover:bg-orange-700"
                      >
                        <Vote className="h-4 w-4 mr-2" />
                        Vote Now
                      </Button>
                    </Link>
                    <Link href={`/hackathons/${assignment.hackathon.id}`}>
                      <Button size="sm" variant="outline">
                        View Details
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dismissNotification(assignment.hackathon.id)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

"use client";

// useState import removed as it's not used
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Clock,
  Users,
  Vote,
  Calendar,
  AlertCircle,
  CheckCircle,
  ExternalLink,
} from "lucide-react";
import { type JudgeHackathonAssignment } from "@/lib/api-functions";

interface AssignedHackathonsProps {
  assignments: JudgeHackathonAssignment[];
  activeFilter: "all" | "pending" | "completed" | "overdue";
  onFilterChange: (filter: "all" | "pending" | "completed" | "overdue") => void;
  onRefresh: () => void;
}

export function AssignedHackathons({
  assignments,
  activeFilter,
  onFilterChange,
  onRefresh,
}: AssignedHackathonsProps) {
  const getPriorityColor = (priority: "high" | "medium" | "low") => {
    switch (priority) {
      case "high":
        return "destructive";
      case "medium":
        return "default";
      case "low":
        return "secondary";
    }
  };

  const getPriorityIcon = (assignment: JudgeHackathonAssignment) => {
    if (assignment.isOverdue) {
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
    if (assignment.votingProgress.pendingVotes === 0) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
    return <Clock className="h-4 w-4 text-orange-600" />;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ko-KR", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getFilterCounts = () => {
    const all = assignments.length;
    const pending = assignments.filter(
      (a) => a.votingProgress.pendingVotes > 0,
    ).length;
    const completed = assignments.filter(
      (a) => a.votingProgress.pendingVotes === 0,
    ).length;
    const overdue = assignments.filter((a) => a.isOverdue).length;

    return { all, pending, completed, overdue };
  };

  const counts = getFilterCounts();

  if (assignments.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Assigned Hackathons</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No hackathon assignments found.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Assigned Hackathons</CardTitle>
          <Button variant="outline" size="sm" onClick={onRefresh}>
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs
          value={activeFilter}
          onValueChange={(value) =>
            onFilterChange(value as "all" | "pending" | "completed" | "overdue")
          }
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
            <TabsTrigger value="pending">
              Pending ({counts.pending})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Done ({counts.completed})
            </TabsTrigger>
            <TabsTrigger value="overdue">
              Overdue ({counts.overdue})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeFilter} className="mt-4">
            <div className="space-y-4">
              {assignments.map((assignment) => (
                <Card
                  key={assignment.hackathon.id}
                  className="border-l-4 border-l-primary"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getPriorityIcon(assignment)}
                          <h3 className="font-semibold text-lg">
                            {assignment.hackathon.title}
                          </h3>
                          <Badge
                            variant={getPriorityColor(assignment.priority)}
                          >
                            {assignment.priority} priority
                          </Badge>
                          {assignment.isOverdue && (
                            <Badge variant="destructive">Overdue</Badge>
                          )}
                        </div>

                        <p className="text-muted-foreground mb-3 line-clamp-2">
                          {assignment.hackathon.description}
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div className="flex items-center gap-2 text-sm">
                            <Users className="h-4 w-4" />
                            <span>
                              {assignment.votingProgress.totalParticipants}{" "}
                              participants
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Vote className="h-4 w-4" />
                            <span>
                              {assignment.votingProgress.completedVotes}/
                              {assignment.votingProgress.totalParticipants}{" "}
                              voted
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4" />
                            <span>Due: {formatDate(assignment.deadline)}</span>
                          </div>
                        </div>

                        <div className="mb-4">
                          <div className="flex justify-between text-sm mb-1">
                            <span>Voting Progress</span>
                            <span>
                              {assignment.votingProgress.completionPercentage.toFixed(
                                1,
                              )}
                              %
                            </span>
                          </div>
                          <Progress
                            value={
                              assignment.votingProgress.completionPercentage
                            }
                            className="h-2"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          <Link
                            href={`/hackathons/${assignment.hackathon.id}/voting`}
                          >
                            <Button variant="default" size="sm">
                              <Vote className="h-4 w-4 mr-2" />
                              Start Voting
                            </Button>
                          </Link>
                          <Link href={`/hackathons/${assignment.hackathon.id}`}>
                            <Button variant="outline" size="sm">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View Details
                            </Button>
                          </Link>
                        </div>
                      </div>

                      <div className="text-right ml-4">
                        <div className="text-sm text-muted-foreground">
                          {assignment.daysUntilDeadline >= 0
                            ? `${assignment.daysUntilDeadline} days left`
                            : `${Math.abs(assignment.daysUntilDeadline)} days overdue`}
                        </div>
                        {assignment.votingProgress.pendingVotes > 0 && (
                          <div className="text-sm font-medium text-orange-600 mt-1">
                            {assignment.votingProgress.pendingVotes} votes
                            pending
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

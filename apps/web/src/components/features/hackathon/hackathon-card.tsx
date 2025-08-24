"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Trophy, Clock } from "lucide-react";
import { formatDistanceToNow, isBefore } from "date-fns";
import type { Hackathon } from "@/types/global";

interface HackathonCardProps {
  hackathon: Hackathon;
  onParticipate?: (hackathon: Hackathon) => void;
  onViewDetails?: (hackathon: Hackathon) => void;
  isParticipating?: boolean;
  showVoting?: boolean;
  onVote?: (hackathon: Hackathon) => void;
}

export function HackathonCard({
  hackathon,
  onParticipate,
  onViewDetails,
  isParticipating = false,
  showVoting = false,
  onVote,
}: HackathonCardProps) {
  const now = new Date();
  const registrationDeadline = new Date(hackathon.registrationDeadline);
  const submissionDeadline = new Date(hackathon.submissionDeadline);
  const votingDeadline = new Date(hackathon.votingDeadline);

  // Determine hackathon phase
  const getPhase = () => {
    if (isBefore(now, registrationDeadline)) {
      return "registration";
    } else if (isBefore(now, submissionDeadline)) {
      return "development";
    } else if (isBefore(now, votingDeadline)) {
      return "voting";
    } else {
      return "completed";
    }
  };

  const phase = getPhase();

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case "registration":
        return "bg-green-100 text-green-800";
      case "development":
        return "bg-blue-100 text-blue-800";
      case "voting":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getDeadlineText = () => {
    switch (phase) {
      case "registration":
        return `Registration ends ${formatDistanceToNow(registrationDeadline, { addSuffix: true })}`;
      case "development":
        return `Submission due ${formatDistanceToNow(submissionDeadline, { addSuffix: true })}`;
      case "voting":
        return `Voting ends ${formatDistanceToNow(votingDeadline, { addSuffix: true })}`;
      default:
        return "Completed";
    }
  };

  const canParticipate = phase === "registration" && !isParticipating;
  const canVote = phase === "voting" && showVoting;

  return (
    <Card className="transition-shadow duration-200 hover:shadow-lg">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="text-xl font-bold line-clamp-2">
              {hackathon.title}
            </CardTitle>
            <Badge className={getPhaseColor(phase)}>
              {phase.charAt(0).toUpperCase() + phase.slice(1)}
            </Badge>
          </div>
          <div className="flex items-center gap-1 text-green-600">
            <Trophy className="w-4 h-4" />
            <span className="font-semibold">Prize Pool</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-muted-foreground line-clamp-3">
          {hackathon.description}
        </p>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span>0 participants</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span>
              Created by {hackathon.organizerAddress?.slice(0, 6)}...
              {hackathon.organizerAddress?.slice(-4)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>{getDeadlineText()}</span>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => onViewDetails?.(hackathon)}
            className="flex-1"
          >
            View Details
          </Button>

          {canParticipate && (
            <Button
              onClick={() => onParticipate?.(hackathon)}
              className="flex-1"
            >
              Participate
            </Button>
          )}

          {isParticipating && phase === "development" && (
            <Button
              variant="secondary"
              onClick={() => onViewDetails?.(hackathon)}
              className="flex-1"
            >
              Update Submission
            </Button>
          )}

          {canVote && (
            <Button onClick={() => onVote?.(hackathon)} className="flex-1">
              Vote
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

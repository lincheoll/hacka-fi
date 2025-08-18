"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Settings, Play, SkipForward, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { type Hackathon, HackathonStatus } from "@/types/global";
import {
  getStatusInfo,
  getPossibleNextStatuses,
  isValidStatusTransition,
  getNextAutomaticStatus,
  STATUS_INFO,
} from "@/lib/hackathon-status";
import { HackathonStatusBadge } from "./hackathon-status-badge";
import { HackathonCountdown } from "./hackathon-countdown";

interface StatusManagementProps {
  hackathon: Hackathon;
  isOrganizer: boolean;
  onStatusUpdate: (newStatus: HackathonStatus) => Promise<void>;
}

export function StatusManagement({
  hackathon,
  isOrganizer,
  onStatusUpdate,
}: StatusManagementProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<HackathonStatus | null>(
    null,
  );
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const router = useRouter();

  const currentStatusInfo = getStatusInfo(hackathon.status);
  const possibleNextStatuses = getPossibleNextStatuses(hackathon.status);
  const automaticTransition = getNextAutomaticStatus(hackathon);

  const handleStatusChange = async (newStatus: HackathonStatus) => {
    if (!isValidStatusTransition(hackathon.status, newStatus)) {
      return;
    }

    setIsUpdating(true);
    try {
      await onStatusUpdate(newStatus);
      setShowConfirmDialog(false);
      setSelectedStatus(null);
      router.refresh();
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusIcon = (status: HackathonStatus) => {
    switch (status) {
      case HackathonStatus.REGISTRATION_OPEN:
        return <Play className="h-4 w-4" />;
      case HackathonStatus.SUBMISSION_OPEN:
        return <Play className="h-4 w-4" />;
      case HackathonStatus.VOTING_OPEN:
        return <Play className="h-4 w-4" />;
      case HackathonStatus.COMPLETED:
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <SkipForward className="h-4 w-4" />;
    }
  };

  const getActionLabel = (status: HackathonStatus) => {
    switch (status) {
      case HackathonStatus.REGISTRATION_OPEN:
        return "Open Registration";
      case HackathonStatus.SUBMISSION_OPEN:
        return "Open Submissions";
      case HackathonStatus.VOTING_OPEN:
        return "Open Voting";
      case HackathonStatus.COMPLETED:
        return "Complete Hackathon";
      default:
        return `Change to ${STATUS_INFO[status].label}`;
    }
  };

  if (!isOrganizer) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Hackathon Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Current Status:</span>
            <HackathonStatusBadge status={hackathon.status} />
          </div>

          <div className="text-sm text-gray-600">
            {currentStatusInfo.description}
          </div>

          <HackathonCountdown hackathon={hackathon} />

          {automaticTransition.newStatus && (
            <Alert>
              <AlertDescription>
                Status will automatically change to{" "}
                <Badge variant="outline" className="mx-1">
                  {STATUS_INFO[automaticTransition.newStatus].label}
                </Badge>
                {automaticTransition.reason &&
                  ` - ${automaticTransition.reason}`}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Status Management
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Current Status:</span>
          <HackathonStatusBadge status={hackathon.status} />
        </div>

        <div className="text-sm text-gray-600">
          {currentStatusInfo.description}
        </div>

        <HackathonCountdown hackathon={hackathon} />

        {automaticTransition.newStatus && (
          <Alert>
            <AlertDescription>
              Status will automatically change to{" "}
              <Badge variant="outline" className="mx-1">
                {STATUS_INFO[automaticTransition.newStatus].label}
              </Badge>
              {automaticTransition.reason && ` - ${automaticTransition.reason}`}
            </AlertDescription>
          </Alert>
        )}

        {possibleNextStatuses.length > 0 && (
          <div className="space-y-3">
            <div className="text-sm font-medium">Manual Status Changes:</div>
            <div className="grid gap-2">
              {possibleNextStatuses.map((status) => (
                <Dialog
                  key={status}
                  open={showConfirmDialog && selectedStatus === status}
                  onOpenChange={setShowConfirmDialog}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="justify-start"
                      onClick={() => setSelectedStatus(status)}
                    >
                      {getStatusIcon(status)}
                      {getActionLabel(status)}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Confirm Status Change</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to change the hackathon status
                        from{" "}
                        <Badge variant="outline" className="mx-1">
                          {currentStatusInfo.label}
                        </Badge>
                        to{" "}
                        <Badge variant="outline" className="mx-1">
                          {STATUS_INFO[status].label}
                        </Badge>
                        ?
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                      <div className="text-sm text-gray-600">
                        <strong>This will:</strong>
                        <ul className="mt-2 list-disc list-inside space-y-1">
                          {status === HackathonStatus.REGISTRATION_OPEN && (
                            <li>
                              Allow participants to register for the hackathon
                            </li>
                          )}
                          {status === HackathonStatus.REGISTRATION_CLOSED && (
                            <li>Stop new registrations</li>
                          )}
                          {status === HackathonStatus.SUBMISSION_OPEN && (
                            <li>
                              Allow registered participants to submit their
                              projects
                            </li>
                          )}
                          {status === HackathonStatus.SUBMISSION_CLOSED && (
                            <li>Stop new submissions</li>
                          )}
                          {status === HackathonStatus.VOTING_OPEN && (
                            <li>Allow judges to vote on submissions</li>
                          )}
                          {status === HackathonStatus.VOTING_CLOSED && (
                            <li>Stop voting and prepare for results</li>
                          )}
                          {status === HackathonStatus.COMPLETED && (
                            <li>Mark the hackathon as completed</li>
                          )}
                        </ul>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setShowConfirmDialog(false)}
                        disabled={isUpdating}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() =>
                          selectedStatus && handleStatusChange(selectedStatus)
                        }
                        disabled={isUpdating}
                      >
                        {isUpdating ? "Updating..." : "Confirm Change"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              ))}
            </div>
          </div>
        )}

        {possibleNextStatuses.length === 0 &&
          !automaticTransition.newStatus && (
            <Alert>
              <AlertDescription>
                No manual status transitions available. The hackathon is in its
                final state.
              </AlertDescription>
            </Alert>
          )}
      </CardContent>
    </Card>
  );
}

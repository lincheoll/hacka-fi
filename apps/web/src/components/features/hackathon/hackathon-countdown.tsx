"use client";

import { useState, useEffect } from "react";
import { Clock, AlertCircle } from "lucide-react";
import { type Hackathon } from "@/types/global";
import { getTimeRemaining, formatTimeRemaining } from "@/lib/hackathon-status";
import { cn } from "@/lib/utils";

interface HackathonCountdownProps {
  hackathon: Hackathon;
  className?: string;
  compact?: boolean;
  showIcon?: boolean;
}

export function HackathonCountdown({
  hackathon,
  className,
  compact = false,
  showIcon = true,
}: HackathonCountdownProps) {
  const [timeData, setTimeData] = useState(() => getTimeRemaining(hackathon));

  useEffect(() => {
    const updateTime = () => {
      setTimeData(getTimeRemaining(hackathon));
    };

    // Update immediately
    updateTime();

    // Set up interval to update every second
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, [hackathon]);

  if (!timeData.deadline || !timeData.label) {
    return null;
  }

  const isUrgent =
    timeData.timeRemaining !== null &&
    timeData.timeRemaining < 24 * 60 * 60 * 1000; // Less than 24 hours
  const isPastDeadline = timeData.isPastDeadline;

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-1 text-sm",
          isPastDeadline
            ? "text-red-600"
            : isUrgent
              ? "text-orange-600"
              : "text-gray-600",
          className,
        )}
      >
        {showIcon &&
          (isPastDeadline ? (
            <AlertCircle className="h-4 w-4" />
          ) : (
            <Clock className="h-4 w-4" />
          ))}
        <span className="font-medium">
          {timeData.timeRemaining !== null
            ? formatTimeRemaining(timeData.timeRemaining)
            : "Deadline passed"}
        </span>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col space-y-1", className)}>
      <div className="flex items-center gap-2">
        {showIcon &&
          (isPastDeadline ? (
            <AlertCircle className="h-4 w-4 text-red-500" />
          ) : (
            <Clock className="h-4 w-4 text-gray-500" />
          ))}
        <span className="text-sm text-gray-600 font-medium">
          {timeData.label}
        </span>
      </div>

      <div
        className={cn(
          "text-lg font-bold",
          isPastDeadline
            ? "text-red-600"
            : isUrgent
              ? "text-orange-600"
              : "text-green-600",
        )}
      >
        {timeData.timeRemaining !== null
          ? formatTimeRemaining(timeData.timeRemaining)
          : "Deadline passed"}
      </div>

      {!isPastDeadline && timeData.deadline && (
        <div className="text-xs text-gray-500">
          Until {timeData.deadline.toLocaleDateString()} at{" "}
          {timeData.deadline.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      )}
    </div>
  );
}

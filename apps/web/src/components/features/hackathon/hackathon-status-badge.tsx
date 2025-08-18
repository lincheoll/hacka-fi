"use client";

import { Badge } from "@/components/ui/badge";
import { type Hackathon, HackathonStatus } from "@/types/global";
import { getStatusInfo } from "@/lib/hackathon-status";
import { cn } from "@/lib/utils";

interface HackathonStatusBadgeProps {
  status: HackathonStatus;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "text-xs px-2 py-1",
  md: "text-sm px-3 py-1",
  lg: "text-base px-4 py-2",
};

const colorClasses = {
  gray: "bg-gray-100 text-gray-800 border-gray-300",
  blue: "bg-blue-100 text-blue-800 border-blue-300",
  green: "bg-green-100 text-green-800 border-green-300",
  yellow: "bg-yellow-100 text-yellow-800 border-yellow-300",
  red: "bg-red-100 text-red-800 border-red-300",
  purple: "bg-purple-100 text-purple-800 border-purple-300",
};

export function HackathonStatusBadge({
  status,
  className,
  size = "md",
}: HackathonStatusBadgeProps) {
  const statusInfo = getStatusInfo(status);

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium border",
        sizeClasses[size],
        colorClasses[statusInfo.color],
        className,
      )}
    >
      {statusInfo.label}
    </Badge>
  );
}

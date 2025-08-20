"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Award, Lock } from "lucide-react";

interface AchievementBadgeProps {
  title: string;
  description: string;
  icon: string;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  isEarned: boolean;
  earnedAt?: string;
  progress?: number;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
  showRarity?: boolean;
  onClick?: () => void;
}

export function AchievementBadge({
  title,
  description,
  icon,
  rarity,
  isEarned,
  earnedAt,
  progress,
  size = "md",
  showTooltip = true,
  showRarity = false,
  onClick,
}: AchievementBadgeProps) {
  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return {
          container: "h-12 w-12",
          icon: "text-xl",
          badge: "h-3 w-3 text-xs",
        };
      case "lg":
        return {
          container: "h-20 w-20",
          icon: "text-4xl",
          badge: "h-5 w-5",
        };
      default:
        return {
          container: "h-16 w-16",
          icon: "text-2xl",
          badge: "h-4 w-4",
        };
    }
  };

  const getRarityStyles = () => {
    const baseStyle =
      "relative flex items-center justify-center rounded-full border-2 transition-all duration-200";

    if (!isEarned) {
      return `${baseStyle} bg-gray-100 border-gray-300 opacity-50 cursor-default`;
    }

    switch (rarity) {
      case "legendary":
        return `${baseStyle} bg-gradient-to-br from-yellow-400 to-yellow-600 border-yellow-300 shadow-lg shadow-yellow-200 hover:shadow-yellow-300 hover:scale-105`;
      case "epic":
        return `${baseStyle} bg-gradient-to-br from-purple-400 to-purple-600 border-purple-300 shadow-lg shadow-purple-200 hover:shadow-purple-300 hover:scale-105`;
      case "rare":
        return `${baseStyle} bg-gradient-to-br from-blue-400 to-blue-600 border-blue-300 shadow-md shadow-blue-200 hover:shadow-blue-300 hover:scale-105`;
      case "uncommon":
        return `${baseStyle} bg-gradient-to-br from-green-400 to-green-600 border-green-300 shadow-md shadow-green-200 hover:shadow-green-300 hover:scale-105`;
      default:
        return `${baseStyle} bg-gradient-to-br from-gray-400 to-gray-600 border-gray-300 hover:scale-105`;
    }
  };

  const getRarityBadgeColor = () => {
    switch (rarity) {
      case "legendary":
        return "bg-yellow-500 text-white";
      case "epic":
        return "bg-purple-500 text-white";
      case "rare":
        return "bg-blue-500 text-white";
      case "uncommon":
        return "bg-green-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const getProgressRing = () => {
    if (isEarned || progress === undefined) return null;

    const circumference = 2 * Math.PI * 20; // radius = 20
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
      <svg
        className="absolute inset-0 transform -rotate-90"
        width="100%"
        height="100%"
        viewBox="0 0 44 44"
      >
        <circle
          cx="22"
          cy="22"
          r="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-gray-200"
        />
        <circle
          cx="22"
          cy="22"
          r="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          className="text-blue-500 transition-all duration-300"
          strokeLinecap="round"
        />
      </svg>
    );
  };

  const sizeClasses = getSizeClasses();

  const badgeContent = (
    <div
      className={`${sizeClasses.container} ${getRarityStyles()} ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      {/* Progress Ring */}
      {getProgressRing()}

      {/* Icon */}
      <span className={`${sizeClasses.icon} ${isEarned ? "" : "grayscale"}`}>
        {isEarned ? icon : <Lock className="h-6 w-6 text-gray-500" />}
      </span>

      {/* Rarity Badge */}
      {showRarity && isEarned && (
        <div
          className={`absolute -top-1 -right-1 ${sizeClasses.badge} rounded-full flex items-center justify-center ${getRarityBadgeColor()}`}
        >
          <Award className="h-2 w-2" />
        </div>
      )}

      {/* Earned Badge */}
      {isEarned && (
        <div className="absolute -bottom-1 -right-1 bg-green-500 text-white rounded-full p-1">
          <Award className="h-3 w-3" />
        </div>
      )}

      {/* Progress Indicator */}
      {!isEarned && progress !== undefined && progress > 0 && (
        <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white rounded-full px-1 py-0.5 text-xs font-bold min-w-[20px] text-center">
          {progress}%
        </div>
      )}
    </div>
  );

  if (!showTooltip) {
    return badgeContent;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badgeContent}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold">{title}</span>
              {showRarity && (
                <Badge variant="outline" className="text-xs">
                  {rarity}
                </Badge>
              )}
            </div>

            <p className="text-sm text-gray-600">{description}</p>

            {isEarned ? (
              <div className="text-xs text-green-600 font-medium">
                ✓ Earned{" "}
                {earnedAt ? new Date(earnedAt).toLocaleDateString() : ""}
              </div>
            ) : progress !== undefined ? (
              <div className="text-xs text-blue-600 font-medium">
                Progress: {progress}%
              </div>
            ) : (
              <div className="text-xs text-gray-500">Not yet earned</div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Preset achievement badges for common use cases
export function FirstParticipationBadge({
  isEarned,
  earnedAt,
}: {
  isEarned: boolean;
  earnedAt?: string;
}) {
  return (
    <AchievementBadge
      title="First Steps"
      description="Participate in your first hackathon"
      icon="🎯"
      rarity="common"
      isEarned={isEarned}
      earnedAt={earnedAt}
    />
  );
}

export function FirstWinBadge({
  isEarned,
  earnedAt,
}: {
  isEarned: boolean;
  earnedAt?: string;
}) {
  return (
    <AchievementBadge
      title="Victory"
      description="Win your first hackathon"
      icon="🏆"
      rarity="uncommon"
      isEarned={isEarned}
      earnedAt={earnedAt}
    />
  );
}

export function SerialWinnerBadge({
  isEarned,
  earnedAt,
}: {
  isEarned: boolean;
  earnedAt?: string;
}) {
  return (
    <AchievementBadge
      title="Serial Winner"
      description="Win 5 hackathons"
      icon="👑"
      rarity="epic"
      isEarned={isEarned}
      earnedAt={earnedAt}
    />
  );
}

export function BigEarnerBadge({
  isEarned,
  earnedAt,
}: {
  isEarned: boolean;
  earnedAt?: string;
}) {
  return (
    <AchievementBadge
      title="Big Earner"
      description="Earn over 10 ETH in prizes"
      icon="💰"
      rarity="rare"
      isEarned={isEarned}
      earnedAt={earnedAt}
    />
  );
}

export function LegendaryBadge({
  isEarned,
  earnedAt,
}: {
  isEarned: boolean;
  earnedAt?: string;
}) {
  return (
    <AchievementBadge
      title="Legendary"
      description="Win 10 hackathons with over 50 ETH earned"
      icon="⚡"
      rarity="legendary"
      isEarned={isEarned}
      earnedAt={earnedAt}
    />
  );
}

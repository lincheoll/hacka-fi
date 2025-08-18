"use client";

import { useState } from "react";
import Image from "next/image";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";

interface AvatarProps {
  src?: string | null;
  alt?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  fallback?: React.ReactNode;
  walletAddress?: string;
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-12 w-12",
  lg: "h-16 w-16",
  xl: "h-24 w-24",
};

const iconSizeClasses = {
  sm: "h-4 w-4",
  md: "h-6 w-6",
  lg: "h-8 w-8",
  xl: "h-12 w-12",
};

export function Avatar({
  src,
  alt,
  size = "md",
  className,
  fallback,
  walletAddress,
}: AvatarProps) {
  const [imageError, setImageError] = useState(false);

  const generateGradient = (address?: string) => {
    if (!address) return "from-gray-400 to-gray-600";

    // Generate a consistent color based on wallet address
    const colors = [
      "from-blue-400 to-blue-600",
      "from-green-400 to-green-600",
      "from-purple-400 to-purple-600",
      "from-pink-400 to-pink-600",
      "from-yellow-400 to-yellow-600",
      "from-red-400 to-red-600",
      "from-indigo-400 to-indigo-600",
      "from-teal-400 to-teal-600",
    ];

    const hash = address.slice(2, 8);
    const index = parseInt(hash, 16) % colors.length;
    return colors[index];
  };

  const displayInitials = (address?: string) => {
    if (!address) return "?";
    return address.slice(2, 4).toUpperCase();
  };

  const shouldShowImage = src && !imageError;

  return (
    <div
      className={cn(
        "relative inline-flex items-center justify-center rounded-full overflow-hidden",
        sizeClasses[size],
        !shouldShowImage &&
          `bg-gradient-to-br ${generateGradient(walletAddress)}`,
        className,
      )}
    >
      {shouldShowImage ? (
        <Image
          src={src}
          alt={alt || "Avatar"}
          fill
          className="object-cover"
          onError={() => setImageError(true)}
          sizes={
            size === "xl"
              ? "96px"
              : size === "lg"
                ? "64px"
                : size === "md"
                  ? "48px"
                  : "32px"
          }
        />
      ) : fallback ? (
        fallback
      ) : walletAddress ? (
        <span
          className={cn(
            "font-semibold text-white",
            size === "xl" ? "text-lg" : size === "lg" ? "text-sm" : "text-xs",
          )}
        >
          {displayInitials(walletAddress)}
        </span>
      ) : (
        <User className={cn("text-white", iconSizeClasses[size])} />
      )}
    </div>
  );
}

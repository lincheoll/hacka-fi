"use client";

import { useState, useCallback } from "react";
import Image from "next/image";
import { ImageIcon, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface OptimizedImageProps {
  src?: string | null;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  fallback?: React.ReactNode;
  priority?: boolean;
  sizes?: string;
  quality?: number;
  placeholder?: "blur" | "empty";
  blurDataURL?: string;
  onError?: () => void;
  onLoad?: () => void;
  enableRetry?: boolean;
  maxRetries?: number;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  fill = false,
  className,
  fallback,
  priority = false,
  sizes,
  quality = 75,
  placeholder = "empty",
  blurDataURL,
  onError,
  onLoad,
  enableRetry = false,
  maxRetries = 2,
}: OptimizedImageProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [imageSrc, setImageSrc] = useState(src);

  const handleError = useCallback(() => {
    if (enableRetry && retryCount < maxRetries) {
      // Try to reload the image with a cache-busting parameter
      const timestamp = Date.now();
      const separator = imageSrc?.includes("?") ? "&" : "?";
      setImageSrc(`${src}${separator}_retry=${timestamp}`);
      setRetryCount((prev) => prev + 1);
      setIsLoading(true);
      return;
    }

    setImageError(true);
    setIsLoading(false);
    onError?.();
  }, [enableRetry, retryCount, maxRetries, src, imageSrc, onError]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    setImageError(false);
    onLoad?.();
  }, [onLoad]);

  const handleRetry = useCallback(() => {
    setImageError(false);
    setIsLoading(true);
    setRetryCount(0);
    setImageSrc(src);
  }, [src]);

  const shouldShowImage = imageSrc && !imageError;

  // Default fallback component
  const defaultFallback = (
    <div
      className={cn(
        "flex items-center justify-center bg-gray-100 text-gray-400",
        fill ? "absolute inset-0" : "w-full h-full",
        className,
      )}
    >
      {imageError ? (
        <div className="flex flex-col items-center gap-2">
          <AlertCircle className="h-8 w-8" />
          <span className="text-sm">Failed to load</span>
          {enableRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              className="h-8 px-2 text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          )}
        </div>
      ) : (
        <ImageIcon className="h-8 w-8" />
      )}
    </div>
  );

  if (!shouldShowImage) {
    return fallback || defaultFallback;
  }

  const imageProps = {
    src: imageSrc,
    alt,
    priority,
    quality,
    placeholder,
    blurDataURL,
    onError: handleError,
    onLoad: handleLoad,
    className: cn(
      "transition-opacity duration-300",
      isLoading && "opacity-0",
      className,
    ),
    ...(fill
      ? {
          fill: true,
          sizes: sizes || "100vw",
        }
      : {
          width: width || 400,
          height: height || 200,
        }),
  };

  return (
    <>
      <Image {...imageProps} alt={alt || ""} />
      {isLoading && (
        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center bg-gray-100",
            "animate-pulse",
          )}
        >
          <ImageIcon className="h-8 w-8 text-gray-400" />
        </div>
      )}
    </>
  );
}

// Preset components for common use cases
export function HackathonCoverImage({
  src,
  alt,
  className,
}: {
  src?: string | null;
  alt: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative aspect-[2/1] overflow-hidden rounded-lg",
        className,
      )}
    >
      <OptimizedImage
        src={src}
        alt={alt}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        priority={false}
        enableRetry={true}
        maxRetries={3}
        fallback={
          <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
            <div className="text-center">
              <ImageIcon className="h-16 w-16 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No cover image</p>
            </div>
          </div>
        }
      />
    </div>
  );
}

export function ParticipantAvatar({
  src,
  alt,
  size = "md",
  walletAddress,
  className,
}: {
  src?: string | null;
  alt: string;
  size?: "sm" | "md" | "lg";
  walletAddress?: string;
  className?: string;
}) {
  const sizeMap = {
    sm: { size: 32, class: "w-8 h-8" },
    md: { size: 48, class: "w-12 h-12" },
    lg: { size: 64, class: "w-16 h-16" },
  };

  const { size: imageSize, class: sizeClass } = sizeMap[size];

  const generateGradient = (address?: string) => {
    if (!address) return "from-gray-400 to-gray-600";

    const colors = [
      "from-blue-400 to-blue-600",
      "from-green-400 to-green-600",
      "from-purple-400 to-purple-600",
      "from-pink-400 to-pink-600",
      "from-yellow-400 to-yellow-600",
      "from-red-400 to-red-600",
    ];

    const hash = address.slice(2, 8);
    const index = parseInt(hash, 16) % colors.length;
    return colors[index];
  };

  const getInitials = (address?: string) => {
    if (!address) return "?";
    return address.slice(2, 4).toUpperCase();
  };

  return (
    <div
      className={cn(
        "relative rounded-full overflow-hidden",
        sizeClass,
        className,
      )}
    >
      <OptimizedImage
        src={src}
        alt={alt}
        width={imageSize}
        height={imageSize}
        className="object-cover"
        fallback={
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-center text-white font-semibold",
              `bg-gradient-to-br ${generateGradient(walletAddress)}`,
              size === "sm" ? "text-xs" : size === "md" ? "text-sm" : "text-lg",
            )}
          >
            {getInitials(walletAddress)}
          </div>
        }
      />
    </div>
  );
}

"use client";

import { Component, type ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ImageErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ImageErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error) => void;
  className?: string;
}

export class ImageErrorBoundary extends Component<
  ImageErrorBoundaryProps,
  ImageErrorBoundaryState
> {
  constructor(props: ImageErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ImageErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error("Image Error Boundary caught an error:", error);
    this.props.onError?.(error);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className={this.props.className}>
          <Alert className="border-amber-500 bg-amber-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Unable to load image content</span>
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleReset}
                className="ml-2"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component wrapper for easier use
export function withImageErrorBoundary<T extends object>(
  Component: React.ComponentType<T>,
  fallback?: ReactNode,
) {
  return function WrappedComponent(props: T) {
    return (
      <ImageErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ImageErrorBoundary>
    );
  };
}

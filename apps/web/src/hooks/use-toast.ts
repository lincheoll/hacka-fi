import { useCallback } from "react";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: "default" | "destructive";
  duration?: number;
}

// Simple alert-based implementation for compatibility
export const useToast = () => {
  const toast = useCallback(
    ({ title, description, variant }: Omit<Toast, "id">) => {
      const message = description ? `${title}: ${description}` : title;
      if (variant === "destructive") {
        alert(`Error: ${message}`);
      } else {
        alert(`Success: ${message}`);
      }
    },
    [],
  );

  return { toast };
};

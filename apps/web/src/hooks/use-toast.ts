import { useState, useCallback } from "react";

export interface Toast {
  id?: string;
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
  duration?: number;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback(
    ({ title, description, variant = "default", duration = 5000 }: Toast) => {
      const id = Math.random().toString(36).substr(2, 9);
      const newToast = { id, title, description, variant, duration };

      setToasts((prev) => [...prev, newToast]);

      // Simple console logging for now - in a real app you'd show UI notifications
      if (variant === "destructive") {
        console.error(`Toast Error - ${title}: ${description}`);
      } else {
        console.log(`Toast - ${title}: ${description}`);
      }

      // Auto-remove after duration
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);

      return newToast;
    },
    [],
  );

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return {
    toast,
    dismiss,
    toasts,
  };
}

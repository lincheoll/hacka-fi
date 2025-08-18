"use client";

import { useEffect, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { type Hackathon } from "@/types/global";
import { getNextAutomaticStatus } from "@/lib/hackathon-status";

interface StatusMonitorOptions {
  enabled?: boolean;
  interval?: number; // in milliseconds
  onStatusChange?: (
    hackathon: Hackathon,
    newStatus: string,
    reason: string,
  ) => void;
}

/**
 * Hook to monitor hackathon status and trigger automatic updates
 */
export function useStatusMonitor(
  hackathon: Hackathon | undefined,
  options: StatusMonitorOptions = {},
) {
  const {
    enabled = true,
    interval = 60000, // 1 minute
    onStatusChange,
  } = options;

  const queryClient = useQueryClient();
  const intervalRef = useRef<NodeJS.Timeout>();
  const lastCheckRef = useRef<string>();

  const checkAndUpdateStatus = useCallback(async () => {
    if (!hackathon || !enabled) return;

    try {
      const { newStatus, reason } = getNextAutomaticStatus(hackathon);

      if (newStatus && reason) {
        // Status needs to be updated
        console.log(`Status change detected for hackathon ${hackathon.id}:`, {
          from: hackathon.status,
          to: newStatus,
          reason,
        });

        // Call the callback if provided
        onStatusChange?.(hackathon, newStatus, reason);

        // Invalidate queries to refetch fresh data
        await queryClient.invalidateQueries({
          queryKey: ["hackathon", hackathon.id],
        });

        // Also invalidate the hackathons list
        await queryClient.invalidateQueries({
          queryKey: ["hackathons"],
        });

        // Store this check to avoid duplicate updates
        lastCheckRef.current = `${hackathon.id}-${newStatus}-${Date.now()}`;
      }
    } catch (error) {
      console.error("Status check failed:", error);
    }
  }, [hackathon, enabled, onStatusChange, queryClient]);

  useEffect(() => {
    if (!enabled || !hackathon) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      return;
    }

    // Initial check
    checkAndUpdateStatus();

    // Set up periodic checks
    intervalRef.current = setInterval(checkAndUpdateStatus, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkAndUpdateStatus, enabled, interval]);

  // Manual trigger function
  const triggerCheck = useCallback(() => {
    checkAndUpdateStatus();
  }, [checkAndUpdateStatus]);

  return {
    triggerCheck,
    isMonitoring: enabled && !!hackathon,
  };
}

/**
 * Hook to monitor multiple hackathons (for admin dashboard)
 */
export function useMultiStatusMonitor(
  hackathons: Hackathon[],
  options: StatusMonitorOptions = {},
) {
  const {
    enabled = true,
    interval = 60000, // 1 minute
    onStatusChange,
  } = options;

  const queryClient = useQueryClient();
  const intervalRef = useRef<NodeJS.Timeout>();

  const checkAllStatuses = useCallback(async () => {
    if (!enabled || hackathons.length === 0) return;

    const statusChanges: Array<{
      hackathon: Hackathon;
      newStatus: string;
      reason: string;
    }> = [];

    for (const hackathon of hackathons) {
      try {
        const { newStatus, reason } = getNextAutomaticStatus(hackathon);

        if (newStatus && reason) {
          statusChanges.push({
            hackathon,
            newStatus,
            reason,
          });
        }
      } catch (error) {
        console.error(
          `Status check failed for hackathon ${hackathon.id}:`,
          error,
        );
      }
    }

    if (statusChanges.length > 0) {
      console.log(
        `Detected ${statusChanges.length} status changes:`,
        statusChanges,
      );

      // Notify about all changes
      for (const change of statusChanges) {
        onStatusChange?.(change.hackathon, change.newStatus, change.reason);
      }

      // Invalidate all hackathon queries
      await queryClient.invalidateQueries({
        queryKey: ["hackathons"],
      });

      // Invalidate individual hackathon queries
      for (const change of statusChanges) {
        await queryClient.invalidateQueries({
          queryKey: ["hackathon", change.hackathon.id],
        });
      }
    }

    return statusChanges;
  }, [hackathons, enabled, onStatusChange, queryClient]);

  useEffect(() => {
    if (!enabled || hackathons.length === 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      return;
    }

    // Initial check
    checkAllStatuses();

    // Set up periodic checks
    intervalRef.current = setInterval(checkAllStatuses, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkAllStatuses, enabled, interval]);

  const triggerCheck = useCallback(() => {
    return checkAllStatuses();
  }, [checkAllStatuses]);

  return {
    triggerCheck,
    isMonitoring: enabled && hackathons.length > 0,
  };
}

"use client";

import { useCallback } from "react";
import { useAuth } from "./use-auth";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

/**
 * Hook for actions that require authentication
 * Automatically handles authentication flow before executing actions
 */
export function useRequireAuth() {
  const { ensureAuthenticated, isLoading } = useAuth();

  /**
   * Execute an action that requires authentication
   * Automatically authenticates user if needed
   */
  const requireAuth = useCallback(
    async <T>(
      action: () => Promise<T> | T,
      options?: {
        loadingMessage?: string;
        errorMessage?: string;
      },
    ): Promise<T | null> => {
      const {
        loadingMessage = "Authenticating...",
        errorMessage = "Authentication required to perform this action",
      } = options || {};

      try {
        // Show loading state
        if (loadingMessage && !isLoading) {
          toast.info(loadingMessage, {
            description: "Authenticating with server...",
          });
        }

        // Ensure user is authenticated
        const isAuthenticated = await ensureAuthenticated();
        if (!isAuthenticated) {
          toast.error("Authentication Failed", {
            description: errorMessage,
          });
          return null;
        }

        // Execute the action
        const result = await action();
        return result;
      } catch (error) {
        console.error("requireAuth action failed:", error);
        toast.error("Action Failed", {
          description:
            error instanceof Error ? error.message : "An error occurred",
        });
        return null;
      }
    },
    [ensureAuthenticated, isLoading],
  );

  /**
   * Create a hackathon (requires authentication)
   */
  const createHackathon = useCallback(
    async (hackathonData: any) => {
      return requireAuth(() => apiClient.post("/hackathons", hackathonData), {
        loadingMessage: "Creating Hackathon...",
        errorMessage: "Authentication required to create hackathon",
      });
    },
    [requireAuth],
  );

  /**
   * Participate in hackathon (requires authentication)
   */
  const participateHackathon = useCallback(
    async (hackathonId: string, participationData: any) => {
      return requireAuth(
        () =>
          apiClient.post(
            `/hackathons/${hackathonId}/participate`,
            participationData,
          ),
        {
          loadingMessage: "Joining Hackathon...",
          errorMessage: "Authentication required to participate",
        },
      );
    },
    [requireAuth],
  );

  /**
   * Submit vote (requires authentication)
   */
  const submitVote = useCallback(
    async (hackathonId: string, voteData: any) => {
      return requireAuth(
        () => apiClient.post(`/hackathons/${hackathonId}/vote`, voteData),
        {
          loadingMessage: "Submitting Vote...",
          errorMessage: "Authentication required to vote",
        },
      );
    },
    [requireAuth],
  );

  /**
   * Update profile (requires authentication)
   */
  const updateProfile = useCallback(
    async (profileData: any) => {
      return requireAuth(() => apiClient.patch("/users/me", profileData), {
        loadingMessage: "Updating Profile...",
        errorMessage: "Authentication required to update profile",
      });
    },
    [requireAuth],
  );

  return {
    requireAuth,
    createHackathon,
    participateHackathon,
    submitVote,
    updateProfile,
    isLoading,
  };
}

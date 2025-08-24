"use client";

import { useState, useCallback } from "react";
import { useSignMessage, useAccount, useDisconnect } from "wagmi";
import { useAuthStore } from "@/store/auth";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api-client";

export function useAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { disconnect } = useDisconnect();
  const {
    login: setAuthState,
    logout: clearAuthState,
    isAuthenticated,
    user,
    token,
  } = useAuthStore();
  const { toast } = useToast();

  /**
   * Get nonce from backend for wallet authentication
   */
  const getNonce = useCallback(async (walletAddress: string) => {
    return apiClient.auth.generateNonce(walletAddress);
  }, []);

  /**
   * Submit signed message to backend for JWT token
   */
  const submitSignature = useCallback(
    async (address: string, signature: string, message: string) => {
      return apiClient.auth.login(address, signature, message);
    },
    [],
  );

  /**
   * Complete Web3 authentication flow
   */
  const authenticate = useCallback(async (): Promise<void> => {
    if (!address || !isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Step 1: Get nonce from backend
      toast({
        title: "Generating Authentication Request",
        description: "Getting nonce from server...",
      });

      const { nonce, message } = await getNonce(address);

      // Step 2: Sign message with wallet
      toast({
        title: "Sign Message",
        description: "Please sign the message in your wallet",
      });

      const signature = await signMessageAsync({ message });

      // Step 3: Submit signature to backend
      toast({
        title: "Verifying Signature",
        description: "Authenticating with server...",
      });

      const loginResponse = await submitSignature(address, signature, message);

      // Step 4: Store authentication state
      const userData = {
        id: address,
        walletAddress: address,
        avatarUrl: undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setAuthState(userData, loginResponse.accessToken);

      toast({
        title: "Authentication Successful",
        description: "You are now logged in!",
        variant: "default",
      });
    } catch (error) {
      console.error("Authentication failed:", error);

      toast({
        title: "Authentication Failed",
        description:
          error instanceof Error ? error.message : "Failed to authenticate",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    address,
    isConnected,
    signMessageAsync,
    getNonce,
    submitSignature,
    setAuthState,
    toast,
  ]);

  /**
   * Logout and clear authentication state
   */
  const logout = useCallback(async () => {
    clearAuthState();
    disconnect();

    toast({
      title: "Logged Out",
      description: "You have been successfully logged out",
    });
  }, [clearAuthState, disconnect, toast]);

  /**
   * Get current authenticated user profile from backend
   */
  const getProfile = useCallback(async () => {
    if (!token) {
      throw new Error("No authentication token");
    }

    return apiClient.auth.getProfile();
  }, [token]);

  /**
   * Check if user needs to authenticate
   * (wallet connected but not authenticated with backend)
   */
  const needsAuthentication = isConnected && address && !isAuthenticated;

  return {
    // State
    isLoading,
    isAuthenticated,
    user,
    token,
    needsAuthentication,

    // Actions
    authenticate,
    logout,
    getProfile,
  };
}

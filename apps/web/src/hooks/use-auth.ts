"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useSignMessage, useAccount, useDisconnect } from "wagmi";
import { useAuthStore } from "@/store/auth";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";

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
    isAuthenticating: globalIsAuthenticating,
    setIsAuthenticating,
  } = useAuthStore();

  // Prevent duplicate authentication calls in React Strict Mode
  const hasAutoAuthCalled = useRef(false);

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
      toast.error("Wallet Not Connected", {
        description: "Please connect your wallet first",
      });
      return;
    }

    // Prevent duplicate authentication calls using global state
    if (globalIsAuthenticating) {
      console.log("Authentication already in progress globally, skipping...");
      return;
    }

    console.log("Starting authentication process");
    setIsAuthenticating(true);
    setIsLoading(true);

    try {
      // Step 1: Get nonce from backend
      toast.info("Generating Authentication Request", {
        description: "Getting nonce from server...",
      });

      const { nonce, message } = await getNonce(address);

      // Step 2: Sign message with wallet
      toast.info("Sign Message", {
        description: "Please sign the message in your wallet",
      });

      const signature = await signMessageAsync({ message });

      // Step 3: Submit signature to backend
      toast.info("Verifying Signature", {
        description: "Verifying signature with server...",
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

      toast.success("Authentication Successful", {
        description: "You are now logged in!",
      });
    } catch (error) {
      console.error("Authentication failed:", error);

      toast.error("Authentication Failed", {
        description:
          error instanceof Error ? error.message : "Failed to authenticate",
      });
    } finally {
      setIsLoading(false);
      setIsAuthenticating(false);
    }
  }, [
    address,
    isConnected,
    signMessageAsync,
    getNonce,
    submitSignature,
    setAuthState,
    setIsAuthenticating,
    globalIsAuthenticating,
  ]);

  /**
   * Logout and clear authentication state
   */
  const logout = useCallback(async () => {
    clearAuthState();
    disconnect();

    toast.success("Logged Out", {
      description: "You have been successfully logged out",
    });
  }, [clearAuthState, disconnect]);

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
   * Check if token is expired by decoding JWT
   */
  const isTokenExpired = useCallback((token: string): boolean => {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }, []);

  /**
   * Validate current authentication state
   */
  const validateAuthState = useCallback(async (): Promise<boolean> => {
    if (!address || !isConnected) return false;

    // Check if we have a token
    if (!token) return false;

    // Check if token is expired
    if (isTokenExpired(token)) {
      clearAuthState();
      return false;
    }

    // Check if token wallet address matches connected address
    if (user?.walletAddress.toLowerCase() !== address.toLowerCase()) {
      clearAuthState();
      toast.error("Wallet Changed", {
        description: "Please authenticate with the new wallet",
      });
      return false;
    }

    return true;
  }, [address, isConnected, token, user, isTokenExpired, clearAuthState]);

  /**
   * Ensure user is authenticated - auto-authenticate if needed
   */
  const ensureAuthenticated = useCallback(async (): Promise<boolean> => {
    if (!address || !isConnected) {
      toast.error("Wallet Not Connected", {
        description: "Please connect your wallet first",
      });
      return false;
    }

    // Check current auth state
    const isValid = await validateAuthState();
    if (isValid) return true;

    // Auto-authenticate
    try {
      await authenticate();
      return true;
    } catch (error) {
      console.error("Auto-authentication failed:", error);
      return false;
    }
  }, [address, isConnected, validateAuthState, authenticate]);

  /**
   * Auto-validate auth state when wallet changes
   */
  useEffect(() => {
    if (isConnected && address && token) {
      validateAuthState();
    }
  }, [address, isConnected, token, validateAuthState]);

  /**
   * Auto-authenticate on first wallet connection
   */
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    if (
      isConnected &&
      address &&
      !token &&
      !isLoading &&
      !globalIsAuthenticating &&
      !hasAutoAuthCalled.current
    ) {
      hasAutoAuthCalled.current = true;

      // Wait a bit for the component to stabilize, then auto-authenticate
      timeoutId = setTimeout(() => {
        authenticate().catch((error) => {
          console.error("Auto-authentication failed:", error);
          hasAutoAuthCalled.current = false; // Reset on error for retry
        });
      }, 1000);
    }

    // Reset flag when conditions change
    if (!isConnected || !address || token) {
      hasAutoAuthCalled.current = false;
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [
    isConnected,
    address,
    token,
    isLoading,
    globalIsAuthenticating,
    authenticate,
  ]);

  /**
   * Check if user needs to authenticate
   * (wallet connected but not authenticated with backend)
   */
  const needsAuthentication = isConnected && address && !isAuthenticated;

  return {
    // State
    isLoading: isLoading || globalIsAuthenticating,
    isAuthenticated,
    user,
    token,
    needsAuthentication,

    // Actions
    authenticate,
    logout,
    getProfile,
    ensureAuthenticated,
    validateAuthState,
  };
}

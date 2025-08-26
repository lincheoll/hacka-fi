/**
 * Enhanced API client with automatic authentication token handling
 */

import { useAuthStore } from "@/store/auth";

interface ApiRequestInit extends RequestInit {
  skipAuth?: boolean;
}

class ApiClient {
  private baseUrl: string;
  private isRefreshing = false;
  private refreshPromise: Promise<boolean> | null = null;

  constructor() {
    // Use environment variable for API base URL, fallback to relative path
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || "/api";
  }

  /**
   * Get the current auth token from store
   */
  private getAuthToken(): string | null {
    return useAuthStore.getState().token;
  }

  /**
   * Auto-refresh authentication when token expires
   */
  private async autoRefreshAuth(): Promise<boolean> {
    if (this.isRefreshing) {
      // If already refreshing, wait for the existing refresh to complete
      return this.refreshPromise || Promise.resolve(false);
    }

    this.isRefreshing = true;
    this.refreshPromise = this.performAuthRefresh();

    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  /**
   * Perform the actual authentication refresh
   */
  private async performAuthRefresh(): Promise<boolean> {
    try {
      // Dynamic import to avoid circular dependency
      const { useAuth } = await import("@/hooks/use-auth");

      // Get the current React context (this is tricky in a class)
      // We'll use a different approach - trigger re-auth through store
      const authStore = useAuthStore.getState();

      // Clear current auth state to trigger re-authentication
      authStore.logout();

      // For automatic re-auth, we need to check if wallet is still connected
      if (typeof window !== "undefined" && window.ethereum) {
        try {
          // Try to get current accounts
          const accounts = await window.ethereum.request({
            method: "eth_accounts",
          });
          if (accounts.length > 0) {
            // Wallet is still connected, trigger re-authentication
            // This will be handled by the useAuth effect
            return true;
          }
        } catch (error) {
          console.error("Failed to check wallet connection:", error);
        }
      }

      return false;
    } catch (error) {
      console.error("Auto-refresh authentication failed:", error);
      return false;
    }
  }

  /**
   * Create authenticated headers
   */
  private createHeaders(headers?: HeadersInit, skipAuth = false): Headers {
    const authHeaders = new Headers(headers);

    // Always set content type if not already set
    if (!authHeaders.has("Content-Type")) {
      authHeaders.set("Content-Type", "application/json");
    }

    // Add authorization header if available and not skipping auth
    if (!skipAuth) {
      const token = this.getAuthToken();
      if (token) {
        authHeaders.set("Authorization", `Bearer ${token}`);
      }
    }

    return authHeaders;
  }

  /**
   * Handle API response
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      // Handle authentication errors
      if (response.status === 401) {
        const { logout } = useAuthStore.getState();
        logout();
        throw new Error("Session expired. Please log in again.");
      }

      // Try to parse error message
      try {
        const errorData = await response.json();
        throw new Error(
          errorData.message ||
            `HTTP ${response.status}: ${response.statusText}`,
        );
      } catch {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    }

    // Handle empty responses
    if (
      response.status === 204 ||
      response.headers.get("content-length") === "0"
    ) {
      return {} as T;
    }

    try {
      return await response.json();
    } catch {
      throw new Error("Invalid JSON response");
    }
  }

  /**
   * Generic request method with auto-retry on 401
   */
  private async request<T>(
    endpoint: string,
    { skipAuth, ...options }: ApiRequestInit = {},
    isRetry = false,
  ): Promise<T> {
    const url = endpoint.startsWith("http")
      ? endpoint
      : `${this.baseUrl}${endpoint}`;

    const config: RequestInit = {
      ...options,
      headers: this.createHeaders(options.headers, skipAuth),
    };

    try {
      const response = await fetch(url, config);

      // Handle 401 with automatic retry
      if (response.status === 401 && !skipAuth && !isRetry) {
        // Try to refresh authentication
        const refreshed = await this.autoRefreshAuth();
        if (refreshed) {
          // Wait a bit for the new token to be available
          await new Promise((resolve) => setTimeout(resolve, 500));

          // Retry the request with new token
          return this.request<T>(endpoint, { skipAuth, ...options }, true);
        }
      }

      return await this.handleResponse<T>(response);
    } catch (error) {
      console.error(
        `API request failed: ${config.method || "GET"} ${url}`,
        error,
      );
      throw error;
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, options?: ApiRequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  /**
   * POST request
   */
  async post<T>(
    endpoint: string,
    data?: any,
    options?: ApiRequestInit,
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(
    endpoint: string,
    data?: any,
    options?: ApiRequestInit,
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch<T>(
    endpoint: string,
    data?: any,
    options?: ApiRequestInit,
  ): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string, options?: ApiRequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }

  /**
   * Authentication-specific methods
   */
  auth = {
    /**
     * Generate nonce (no auth required)
     */
    generateNonce: (address: string) =>
      this.post<{ nonce: string; message: string; expiresIn: number }>(
        "/auth/nonce",
        { address },
        { skipAuth: true },
      ),

    /**
     * Login with signature (no auth required)
     */
    login: (address: string, signature: string, message: string) =>
      this.post<{
        accessToken: string;
        tokenType: string;
        expiresIn: number;
        address: string;
      }>("/auth/login", { address, signature, message }, { skipAuth: true }),

    /**
     * Get current user profile (auth required)
     */
    getProfile: () =>
      this.get<{ address: string; walletAddress: string }>("/auth/profile"),

    /**
     * Health check (no auth required)
     */
    healthCheck: () =>
      this.get<{ status: string; timestamp: string }>("/auth/health", {
        skipAuth: true,
      }),
  };

  /**
   * Platform Fee Management API methods
   */
  platformFee = {
    /**
     * Get current platform fee information (public)
     */
    getFeeInfo: () =>
      this.get<{
        currentFeeRate: number;
        feeRecipient: string;
        lastUpdated?: string;
      }>("/platform/fee-info", { skipAuth: true }),

    /**
     * Get hackathon-specific fee details (public)
     */
    getHackathonFeeDetails: (hackathonId: string) =>
      this.get<{
        totalPrizePool: string;
        feeRate: number;
        feeAmount: string;
        distributionAmount: string;
        feeAmountFormatted: string;
        distributionAmountFormatted: string;
      }>(`/hackathons/${hackathonId}/fee-details`, { skipAuth: true }),

    /**
     * Update platform fee rate (admin only)
     */
    setPlatformFeeRate: (data: { feeRate: number; reason?: string }) =>
      this.post<{
        success: boolean;
        txHash: string;
        message: string;
      }>("/admin/platform-fee/rate", data),

    /**
     * Update platform fee recipient (admin only)
     */
    setPlatformFeeRecipient: (data: { recipient: string }) =>
      this.post<{
        success: boolean;
        txHash: string;
        message: string;
      }>("/admin/platform-fee/recipient", data),

    /**
     * Get platform fee rate change history (admin only)
     */
    getFeeHistory: (limit = 50) =>
      this.get<
        {
          id: number;
          oldFeeRate: number;
          newFeeRate: number;
          changedBy: string;
          reason?: string;
          createdAt: string;
        }[]
      >(`/admin/platform-fee/history?limit=${limit}`),

    /**
     * Get platform fee collection records (admin only)
     */
    getFeeCollections: (hackathonId?: string, limit = 50) => {
      const params = new URLSearchParams({ limit: limit.toString() });
      if (hackathonId) {
        params.append("hackathonId", hackathonId);
      }
      return this.get<
        {
          id: number;
          hackathonId: string;
          prizePoolId: number;
          feeAmount: string;
          feeAmountFormatted: string;
          feeRate: number;
          tokenAddress?: string;
          recipientAddress: string;
          txHash: string;
          blockNumber?: number;
          status: string;
          collectedAt: string;
          confirmedAt?: string;
        }[]
      >(`/admin/fee-collections?${params.toString()}`);
    },
  };
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export types for use in other files
export type { ApiRequestInit };

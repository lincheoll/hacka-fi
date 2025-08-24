import { useAuthStore } from "@/store/auth";
import { API_BASE_URL } from "./constants";
import { ApiResponse, ApiError, PaginatedResponse } from "@/types/api";

// Custom API Error class
export class ApiClientError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    message: string,
    public data?: unknown,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

/**
 * Create headers with optional authentication
 */
export function createAuthHeaders(includeAuth = true): HeadersInit {
  const headers: HeadersInit = {};

  if (includeAuth) {
    const token = useAuthStore.getState().token;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  return headers;
}

class ApiClient {
  public baseUrl: string;
  private defaultHeaders: HeadersInit;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    this.defaultHeaders = {
      "Content-Type": "application/json",
    };
  }

  // Build headers with auth token if available
  private buildHeaders(customHeaders?: HeadersInit): HeadersInit {
    const headers = {
      ...this.defaultHeaders,
      ...customHeaders,
      ...createAuthHeaders(),
    };

    return headers;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = this.buildHeaders(options.headers);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle non-JSON responses (e.g., for file downloads)
      const contentType = response.headers.get("content-type");

      if (!response.ok) {
        let errorData: ApiError;

        if (contentType?.includes("application/json")) {
          errorData = await response.json();
        } else {
          errorData = {
            message: response.statusText || "An error occurred",
            statusCode: response.status,
          };
        }

        throw new ApiClientError(
          response.status,
          response.statusText,
          errorData.message,
          errorData,
        );
      }

      // Return raw response for non-JSON content
      if (!contentType?.includes("application/json")) {
        return response as unknown as T;
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ApiClientError) {
        throw error;
      }

      // Network or other errors
      throw new ApiClientError(
        0,
        "Network Error",
        error instanceof Error ? error.message : "Network request failed",
      );
    }
  }

  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const searchParams = params ? new URLSearchParams(params).toString() : "";
    const url = searchParams ? `${endpoint}?${searchParams}` : endpoint;

    return this.request<T>(url, { method: "GET" });
  }

  async post<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PUT",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string, data?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: "DELETE",
      body: data ? JSON.stringify(data) : undefined,
    });
  }
}

export const apiClient = new ApiClient();

// Helper function for handling paginated responses
export function handlePaginatedResponse<T>(
  response: PaginatedResponse<T>,
): PaginatedResponse<T> {
  return response;
}

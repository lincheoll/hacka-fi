import {
  PublicHackathon,
  PublicWinner,
  PublicPlatformStats,
  PublicTopWinner,
  PublicHackathonQuery,
  PublicHallOfFameQuery,
  PaginatedResponse,
  ApiResponse,
} from "@/types/public-api";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3010";

class PublicApiClient {
  private async fetchApi<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}/public${endpoint}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const result: ApiResponse<T> = await response.json();

    if (!result.success) {
      throw new Error("API request failed");
    }

    return result.data;
  }

  async getCompletedHackathons(
    query: PublicHackathonQuery = {},
  ): Promise<PaginatedResponse<PublicHackathon>> {
    const searchParams = new URLSearchParams();

    if (query.page) searchParams.append("page", query.page.toString());
    if (query.limit) searchParams.append("limit", query.limit.toString());
    if (query.filterBy) searchParams.append("filterBy", query.filterBy);
    if (query.sortOrder) searchParams.append("sortOrder", query.sortOrder);
    if (query.search) searchParams.append("search", query.search);
    if (query.minPrizeAmount)
      searchParams.append("minPrizeAmount", query.minPrizeAmount.toString());
    if (query.maxPrizeAmount)
      searchParams.append("maxPrizeAmount", query.maxPrizeAmount.toString());

    const queryString = searchParams.toString();
    const endpoint = `/hackathons/completed${queryString ? `?${queryString}` : ""}`;

    return this.fetchApi<PaginatedResponse<PublicHackathon>>(endpoint);
  }

  async getHackathonWinners(hackathonId: string): Promise<PublicWinner[]> {
    return this.fetchApi<PublicWinner[]>(`/hackathons/${hackathonId}/winners`);
  }

  async getPlatformStatistics(): Promise<PublicPlatformStats> {
    return this.fetchApi<PublicPlatformStats>("/statistics");
  }

  async getHallOfFame(
    query: PublicHallOfFameQuery = {},
  ): Promise<PaginatedResponse<PublicTopWinner>> {
    const searchParams = new URLSearchParams();

    if (query.page) searchParams.append("page", query.page.toString());
    if (query.limit) searchParams.append("limit", query.limit.toString());
    if (query.sortOrder) searchParams.append("sortOrder", query.sortOrder);

    const queryString = searchParams.toString();
    const endpoint = `/winners/hall-of-fame${queryString ? `?${queryString}` : ""}`;

    return this.fetchApi<PaginatedResponse<PublicTopWinner>>(endpoint);
  }

  async getAllWinners(
    query: PublicHallOfFameQuery = {},
  ): Promise<PaginatedResponse<PublicTopWinner>> {
    const searchParams = new URLSearchParams();

    if (query.page) searchParams.append("page", query.page.toString());
    if (query.limit) searchParams.append("limit", query.limit.toString());
    if (query.sortOrder) searchParams.append("sortOrder", query.sortOrder);

    const queryString = searchParams.toString();
    const endpoint = `/winners${queryString ? `?${queryString}` : ""}`;

    return this.fetchApi<PaginatedResponse<PublicTopWinner>>(endpoint);
  }

  async getHackathonArchive(
    query: PublicHackathonQuery = {},
  ): Promise<PaginatedResponse<PublicHackathon>> {
    const searchParams = new URLSearchParams();

    if (query.page) searchParams.append("page", query.page.toString());
    if (query.limit) searchParams.append("limit", query.limit.toString());
    if (query.filterBy) searchParams.append("filterBy", query.filterBy);
    if (query.sortOrder) searchParams.append("sortOrder", query.sortOrder);
    if (query.search) searchParams.append("search", query.search);
    if (query.minPrizeAmount)
      searchParams.append("minPrizeAmount", query.minPrizeAmount.toString());
    if (query.maxPrizeAmount)
      searchParams.append("maxPrizeAmount", query.maxPrizeAmount.toString());

    const queryString = searchParams.toString();
    const endpoint = `/hackathons/archive${queryString ? `?${queryString}` : ""}`;

    return this.fetchApi<PaginatedResponse<PublicHackathon>>(endpoint);
  }
}

export const publicApi = new PublicApiClient();

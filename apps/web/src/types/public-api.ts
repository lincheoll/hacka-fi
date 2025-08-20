export interface PublicHackathon {
  id: string;
  title: string;
  description: string;
  prizeAmount: string;
  participantCount: number;
  votingDeadline: Date;
  createdAt: Date;
  coverImageUrl?: string | null;
  organizerAddress: string;
  winners: PublicWinner[];
}

export interface PublicWinner {
  rank: number;
  walletAddress: string;
  username?: string | null;
  submissionUrl: string;
  averageScore: number;
  prizeAmount: string;
  avatarUrl?: string | null;
}

export interface PublicPlatformStats {
  totalHackathons: number;
  completedHackathons: number;
  totalParticipants: number;
  totalPrizeDistributed: string;
  averagePrizeAmount: string;
  topWinners: PublicTopWinner[];
}

export interface PublicTopWinner {
  walletAddress: string;
  username?: string | null;
  avatarUrl?: string | null;
  totalWins: number;
  totalEarnings: string;
  winRate: number;
}

export interface PublicHackathonQuery {
  page?: number;
  limit?: number;
  filterBy?: "prizeAmount" | "participantCount" | "dateCreated";
  sortOrder?: "asc" | "desc";
  search?: string;
  minPrizeAmount?: number;
  maxPrizeAmount?: number;
}

export interface PublicHallOfFameQuery {
  page?: number;
  limit?: number;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
}

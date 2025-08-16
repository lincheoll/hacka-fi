import { Hackathon, User, Participant, Vote } from "./global";

// API Response types
export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T = unknown> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Auth API types
export interface LoginRequest {
  walletAddress: string;
  signature: string;
  message: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

// Hackathon API types
export interface CreateHackathonRequest {
  title: string;
  description: string;
  registrationDeadline: string;
  submissionDeadline: string;
  votingDeadline: string;
}

export interface UpdateHackathonRequest
  extends Partial<CreateHackathonRequest> {}

export interface HackathonListResponse extends PaginatedResponse<Hackathon> {}

// Voting API types
export interface CastVoteRequest {
  participantAddress: string;
  score: number;
  comment?: string;
}

// Error types
export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

import { Hackathon, User, Participant } from "./global";

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
  prizeAmount?: number;
  entryFee?: number;
  maxParticipants?: number;
}

export interface UpdateHackathonRequest
  extends Partial<CreateHackathonRequest> {
  // Additional update-specific fields can be added here
}

export interface HackathonListResponse extends PaginatedResponse<Hackathon> {
  // Additional hackathon list response fields can be added here
}

// Participant API types
export interface RegisterParticipantRequest {
  hackathonId: string;
  walletAddress: string;
  entryFeeSignature?: string;
}

export interface RegisterParticipantResponse {
  participant: Participant;
  message: string;
}

export interface UpdateSubmissionRequest {
  submissionUrl: string;
  projectDescription?: string;
  teamMembers?: string[];
}

export interface UpdateSubmissionResponse {
  participant: Participant;
  message: string;
}

export interface ParticipantListResponse
  extends PaginatedResponse<Participant> {
  // Additional participant list response fields can be added here
}

// File upload API types
export interface FileUploadRequest {
  file: File;
  type: "hackathon-cover" | "user-avatar" | "project-image";
  entityId?: string; // hackathon ID or user ID
}

export interface FileUploadResponse {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
  uploadedAt: string;
}

export interface ImageUploadRequest extends FileUploadRequest {
  width?: number;
  height?: number;
  quality?: number;
}

// Judge Management API types
export interface AddJudgeRequest {
  judgeAddress: string;
  note?: string;
}

export interface RemoveJudgeRequest {
  judgeAddress: string;
}

export interface Judge {
  id: number;
  hackathonId: string;
  judgeAddress: string;
  addedBy: string;
  addedAt: string;
  judge?: {
    walletAddress: string;
    username?: string;
    bio?: string;
    avatarUrl?: string;
  };
}

export interface JudgeListResponse {
  judges: Judge[];
  count: number;
}

// Voting API types
export interface CastVoteRequest {
  participantId: number;
  score: number;
  comment?: string;
}

export interface Vote {
  id: number;
  hackathonId: string;
  judgeAddress: string;
  participantId: number;
  score: number;
  comment?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ParticipantVoteSummary {
  participantId: number;
  walletAddress: string;
  submissionUrl?: string;
  totalVotes: number;
  averageScore: number;
  weightedScore?: number;
  normalizedScore?: number;
  rank?: number;
  rankTier?: "winner" | "runner-up" | "participant";
  scoreBreakdown?: {
    simple: number;
    weighted: number;
    normalized: number;
    consensus: number;
  };
  votes: Vote[];
}

export interface RankingMetrics {
  totalParticipants: number;
  totalJudges: number;
  averageParticipation: number;
  scoreDistribution: {
    min: number;
    max: number;
    mean: number;
    median: number;
    standardDeviation: number;
  };
}

export interface VotingResultsResponse {
  hackathonId: string;
  participants: ParticipantVoteSummary[];
  totalJudges: number;
  totalParticipants: number;
  rankingMetrics?: RankingMetrics;
}

// Winner Determination API types
export interface WinnerResult {
  participantId: number;
  walletAddress: string;
  rank: number;
  averageScore: number;
  weightedScore: number;
  prizeAmount?: string;
  prizePosition?: number;
}

export interface PrizeDistribution {
  position: number;
  percentage: number;
  amount: string;
  winner?: WinnerResult;
}

export interface WinnerDeterminationResponse {
  winners: WinnerResult[];
  totalPrizePool: string;
  prizeDistribution: PrizeDistribution[];
  rankingMetrics: RankingMetrics;
}

export interface WinnerStatusResponse {
  finalized: boolean;
}

export interface Top3WinnersResponse {
  firstPlace?: string;
  secondPlace?: string;
  thirdPlace?: string;
}

// Error types
export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

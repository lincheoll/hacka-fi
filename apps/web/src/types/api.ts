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
  id: string;
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
  id: string;
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

// Audit Log API types
export interface AuditLog {
  id: string;
  hackathonId: string;
  action: string;
  fromStatus?: string;
  toStatus?: string;
  reason?: string;
  triggeredBy: string;
  userAddress?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface AuditLogsResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditSummaryResponse {
  totalChanges: number;
  automaticChanges: number;
  manualChanges: number;
  lastChange?: AuditLog;
  timeline: Array<{
    status: string;
    timestamp: string;
    triggeredBy: string;
    reason: string;
  }>;
}

export interface AuditStatisticsResponse {
  totalLogs: number;
  logsByAction: Record<string, number>;
  logsByTrigger: Record<string, number>;
  recentActivity: AuditLog[];
}

export interface HackathonStatusSummaryResponse {
  currentStatus: string;
  statusCounts: Record<string, number>;
  activeHackathonsCount: number;
  recentChanges: Array<{
    hackathonId: string;
    fromStatus: string;
    toStatus: string;
    reason: string;
    timestamp: string;
  }>;
}

// Error types
export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

// Enhanced Voting Period Management API Functions
export interface VotingPeriodInfo {
  hackathonId: string;
  currentStatus: string;
  votingPeriod: {
    startTime: string;
    endTime: string;
    duration: number;
    isActive: boolean;
    hasStarted: boolean;
    hasEnded: boolean;
    timeRemaining: number;
    timeUntilStart: number;
  };
  statistics: {
    totalParticipants: number;
    totalJudges: number;
    totalVotes: number;
    votingParticipation: number;
  };
  nextTransition: {
    newStatus: string | null;
    reason: string | null;
  };
}

export interface VotingPhaseHackathon {
  id: string;
  title: string;
  status: string;
  submissionDeadline: string;
  votingDeadline: string;
  timeUntilVotingEnds: number;
  votingParticipation: number;
  _count: {
    participants: number;
    judges: number;
    votes: number;
  };
}

// Results Export API types
export interface ExportResultsResponse {
  format: "json" | "csv";
  data: unknown;
  headers?: string[];
  hackathonInfo?: HackathonExportInfo;
}

export interface HackathonExportInfo {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  registrationDeadline: string;
  submissionDeadline: string;
  votingDeadline: string;
  organizerAddress: string;
  prizeAmount: string | null;
  totalParticipants: number;
  totalJudges: number;
}

export interface ParticipantExportData {
  id: number;
  walletAddress: string;
  submissionUrl: string | null;
  registeredAt: string;
  rank: number | null;
  prizeAmount: string | null;
  votes: VoteExportData[];
  averageScore: number;
  totalVotes: number;
}

export interface VoteExportData {
  judgeAddress: string;
  judgeName: string;
  score: number;
  comment: string | null;
  createdAt: string;
}

export interface JudgeExportData {
  walletAddress: string;
  name: string;
  assignedAt: string;
}

export interface DetailedExportData {
  hackathon: HackathonExportInfo;
  participants: ParticipantExportData[];
  judges: JudgeExportData[];
  winners: WinnerResult[];
  prizeDistribution: PrizeDistribution[];
  totalPrizePool: string;
  rankingMetrics: RankingMetrics | null;
  exportedAt: string;
}

// User API types
export interface UserParticipation {
  id: number;
  hackathonId: string;
  hackathonTitle: string;
  hackathonStatus: string;
  submissionUrl?: string;
  rank?: number;
  prizeAmount?: string;
  registeredAt: string;
  walletAddress: string;
  isWinner: boolean;
}

export interface UserHackathon {
  id: string;
  title: string;
  description: string;
  status: string;
  organizerAddress: string;
  prizeAmount?: string;
  entryFee?: string;
  maxParticipants?: number;
  registrationDeadline: string;
  submissionDeadline: string;
  votingDeadline: string;
  coverImageUrl?: string;
  createdAt: string;
  updatedAt: string;
  participants: Array<{
    id: number;
    userAddress: string;
    registeredAt: string;
    submissionUrl?: string;
  }>;
  participantCount: number;
  judgeCount: number;
  voteCount: number;
}

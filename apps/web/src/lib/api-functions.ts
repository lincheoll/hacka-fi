import { apiClient, handlePaginatedResponse } from "./api";
import type {
  ApiResponse,
  PaginatedResponse,
  HackathonListResponse,
  CreateHackathonRequest,
  UpdateHackathonRequest,
  CastVoteRequest,
  LoginRequest,
  LoginResponse,
  RegisterParticipantRequest,
  RegisterParticipantResponse,
  UpdateSubmissionRequest,
  UpdateSubmissionResponse,
  FileUploadRequest,
  FileUploadResponse,
  ImageUploadRequest,
  AddJudgeRequest,
  RemoveJudgeRequest,
  Judge,
  JudgeListResponse,
  Vote,
  VotingResultsResponse,
  WinnerDeterminationResponse,
  WinnerStatusResponse,
  Top3WinnersResponse,
  AuditLog,
  AuditLogsResponse,
  AuditSummaryResponse,
  AuditStatisticsResponse,
  HackathonStatusSummaryResponse,
  VotingPeriodInfo,
  VotingPhaseHackathon,
  ExportResultsResponse,
  UserParticipation,
  UserHackathon,
} from "@/types/api";
import type { Hackathon, User, Participant } from "@/types/global";

// Auth API Functions
export async function loginWithWallet(
  data: LoginRequest,
): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>("/auth/login", data);
  return response;
}

export async function getAuthProfile(): Promise<User> {
  const response = await apiClient.get<User>("/auth/profile");
  return response;
}

// Hackathon API Functions
export async function fetchHackathons(filters?: {
  status?: string;
  search?: string;
  creator?: string;
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<Hackathon>> {
  // Convert number values to strings for URLSearchParams
  const stringFilters: Record<string, string> | undefined = filters
    ? {
        ...(filters.status && { status: filters.status }),
        ...(filters.search && { search: filters.search }),
        ...(filters.creator && { creator: filters.creator }),
        ...(filters.page && { page: filters.page.toString() }),
        ...(filters.limit && { limit: filters.limit.toString() }),
      }
    : undefined;

  const response = await apiClient.get<HackathonListResponse>(
    "/hackathons",
    stringFilters,
  );
  return handlePaginatedResponse(response);
}

export async function fetchHackathon(id: string): Promise<Hackathon> {
  const response = await apiClient.get<Hackathon>(`/hackathons/${id}`);
  return response;
}

export async function createHackathon(
  data: CreateHackathonRequest,
): Promise<Hackathon> {
  const response = await apiClient.post<Hackathon>("/hackathons", data);
  return response;
}

export async function updateHackathon(
  id: string,
  data: UpdateHackathonRequest,
): Promise<Hackathon> {
  const response = await apiClient.put<Hackathon>(`/hackathons/${id}`, data);
  return response;
}

// Participant API Functions
export async function registerParticipant(
  data: RegisterParticipantRequest,
): Promise<Participant> {
  const response = await apiClient.post<RegisterParticipantResponse>(
    `/hackathons/${data.hackathonId}/register`,
    data,
  );
  return response.participant;
}

export async function updateSubmission(
  participantId: string,
  data: UpdateSubmissionRequest,
): Promise<Participant> {
  const response = await apiClient.put<UpdateSubmissionResponse>(
    `/participants/${participantId}/submission`,
    data,
  );
  return response.participant;
}

export async function fetchParticipantStatus(
  hackathonId: string,
  walletAddress: string,
): Promise<Participant | null> {
  try {
    const response = await apiClient.get<Participant>(
      `/hackathons/${hackathonId}/participants/${walletAddress}`,
    );
    return response;
  } catch {
    // Return null if participant not found (404)
    return null;
  }
}

export async function fetchUserParticipations(
  walletAddress: string,
): Promise<UserParticipation[]> {
  const response = await apiClient.get<UserParticipation[]>(
    `/users/${walletAddress}/participations`,
  );
  return response;
}

// Legacy function for backward compatibility
export async function participateInHackathon(
  id: string,
  submissionUrl?: string,
): Promise<void> {
  await apiClient.post<void>(`/hackathons/${id}/participate`, {
    submissionUrl,
  });
}

export async function deleteHackathon(id: string): Promise<void> {
  await apiClient.delete<void>(`/hackathons/${id}`);
}

// User API Functions
export async function fetchUserProfile(address: string): Promise<User> {
  const response = await apiClient.get<User>(`/users/${address}`);
  return response;
}

export async function updateUserProfile(data: Partial<User>): Promise<User> {
  const response = await apiClient.post<User>("/users/profile", data);
  return response;
}

export async function fetchUserHackathons(
  address: string,
): Promise<UserHackathon[]> {
  const response = await apiClient.get<UserHackathon[]>(
    `/users/${address}/hackathons`,
  );
  return response;
}

// Judge Management API Functions
export async function addJudge(
  hackathonId: string,
  data: AddJudgeRequest,
): Promise<Judge> {
  const response = await apiClient.post<Judge>(
    `/hackathons/${hackathonId}/judges`,
    data,
  );
  return response;
}

export async function removeJudge(
  hackathonId: string,
  data: RemoveJudgeRequest,
): Promise<void> {
  await apiClient.delete<void>(`/hackathons/${hackathonId}/judges`, data);
}

export async function fetchJudges(
  hackathonId: string,
): Promise<JudgeListResponse> {
  const response = await apiClient.get<JudgeListResponse>(
    `/hackathons/${hackathonId}/judges`,
  );
  return response;
}

// Voting API Functions
export async function castVote(
  hackathonId: string,
  data: CastVoteRequest,
): Promise<Vote> {
  const response = await apiClient.post<Vote>(
    `/hackathons/${hackathonId}/vote`,
    data,
  );
  return response;
}

export async function fetchVotingResults(
  hackathonId: string,
): Promise<VotingResultsResponse> {
  const response = await apiClient.get<VotingResultsResponse>(
    `/hackathons/${hackathonId}/results`,
  );
  return response;
}

export async function fetchHackathonVotes(
  hackathonId: string,
): Promise<unknown[]> {
  const response = await apiClient.get<unknown[]>(
    `/hackathons/${hackathonId}/votes`,
  );
  return response;
}

export async function fetchHackathonParticipants(
  hackathonId: string,
): Promise<Participant[]> {
  const response = await apiClient.get<Participant[]>(
    `/hackathons/${hackathonId}/participants`,
  );
  return response;
}

// File Upload API Functions
export async function uploadFile(
  data: FileUploadRequest,
): Promise<FileUploadResponse> {
  const formData = new FormData();
  formData.append("file", data.file);
  formData.append("type", data.type);
  if (data.entityId) {
    formData.append("entityId", data.entityId);
  }

  const response = await fetch(`${apiClient.baseUrl || ""}/upload`, {
    method: "POST",
    body: formData,
    headers: {
      // Don't set Content-Type, let browser set it with boundary for multipart/form-data
      Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  const result = await response.json();
  return result.data || result;
}

export async function uploadImage(
  data: ImageUploadRequest,
): Promise<FileUploadResponse> {
  const formData = new FormData();
  formData.append("file", data.file);
  formData.append("type", data.type);
  if (data.entityId) {
    formData.append("entityId", data.entityId);
  }
  if (data.width) {
    formData.append("width", data.width.toString());
  }
  if (data.height) {
    formData.append("height", data.height.toString());
  }
  if (data.quality) {
    formData.append("quality", data.quality.toString());
  }

  const response = await fetch(`${apiClient.baseUrl || ""}/upload/image`, {
    method: "POST",
    body: formData,
    headers: {
      Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Image upload failed: ${response.statusText}`);
  }

  const result = await response.json();
  return result.data || result;
}

export async function deleteFile(filename: string): Promise<void> {
  await apiClient.delete<void>(`/upload/${filename}`);
}

// Status Management API Functions
export async function updateHackathonStatus(
  hackathonId: string,
  status: string,
  reason: string,
  metadata?: Record<string, unknown>,
): Promise<{ message: string; hackathon: Hackathon }> {
  const response = await apiClient.patch<{
    message: string;
    hackathon: Hackathon;
  }>(`/hackathons/${hackathonId}/status`, { status, reason, metadata });
  return response;
}

export async function getStatusSummary(): Promise<HackathonStatusSummaryResponse> {
  const response = await apiClient.get<HackathonStatusSummaryResponse>(
    "/hackathons/status/summary",
  );
  return response;
}

// Audit Log API Functions
export async function getAuditLogs(filters?: {
  hackathonId?: string;
  action?: string;
  limit?: number;
  offset?: number;
}): Promise<AuditLogsResponse> {
  const stringFilters: Record<string, string> | undefined = filters
    ? {
        ...(filters.hackathonId && { hackathonId: filters.hackathonId }),
        ...(filters.action && { action: filters.action }),
        ...(filters.limit && { limit: filters.limit.toString() }),
        ...(filters.offset && { offset: filters.offset.toString() }),
      }
    : undefined;

  const response = await apiClient.get<AuditLogsResponse>(
    "/audit/logs",
    stringFilters,
  );
  return response;
}

export async function getHackathonAuditTrail(
  hackathonId: string,
): Promise<AuditLog[]> {
  const response = await apiClient.get<AuditLog[]>(
    `/audit/hackathons/${hackathonId}/trail`,
  );
  return response;
}

export async function getHackathonStatusSummary(
  hackathonId: string,
): Promise<AuditSummaryResponse> {
  const response = await apiClient.get<AuditSummaryResponse>(
    `/audit/hackathons/${hackathonId}/summary`,
  );
  return response;
}

export async function getAuditStatistics(): Promise<AuditStatisticsResponse> {
  const response =
    await apiClient.get<AuditStatisticsResponse>("/audit/statistics");
  return response;
}

// Winner Determination API Functions
export async function calculateWinners(
  hackathonId: string,
): Promise<WinnerDeterminationResponse> {
  const response = await apiClient.get<WinnerDeterminationResponse>(
    `/hackathons/${hackathonId}/winners/calculate`,
  );
  return response;
}

export async function finalizeWinners(
  hackathonId: string,
): Promise<WinnerDeterminationResponse> {
  const response = await apiClient.post<WinnerDeterminationResponse>(
    `/hackathons/${hackathonId}/winners/finalize`,
    {},
  );
  return response;
}

export async function getWinners(
  hackathonId: string,
): Promise<WinnerDeterminationResponse | null> {
  const response = await apiClient.get<WinnerDeterminationResponse | null>(
    `/hackathons/${hackathonId}/winners`,
  );
  return response;
}

export async function getTop3Winners(
  hackathonId: string,
): Promise<Top3WinnersResponse> {
  const response = await apiClient.get<Top3WinnersResponse>(
    `/hackathons/${hackathonId}/winners/top3`,
  );
  return response;
}

export async function areWinnersFinalized(
  hackathonId: string,
): Promise<WinnerStatusResponse> {
  const response = await apiClient.get<WinnerStatusResponse>(
    `/hackathons/${hackathonId}/winners/status`,
  );
  return response;
}

export async function getVotingPeriodInfo(
  hackathonId: string,
): Promise<VotingPeriodInfo> {
  const response = await apiClient.get<VotingPeriodInfo>(
    `/hackathons/${hackathonId}/voting/info`,
  );
  return response;
}

export async function getVotingPhaseHackathons(): Promise<
  VotingPhaseHackathon[]
> {
  const response = await apiClient.get<VotingPhaseHackathon[]>(
    "/hackathons/voting/active",
  );
  return response;
}

export async function forcePhaseTransition(
  hackathonId: string,
  targetStatus: string,
  reason: string,
): Promise<{
  message: string;
  hackathonId: string;
  newStatus: string;
  reason: string;
}> {
  const response = await apiClient.post<{
    message: string;
    hackathonId: string;
    newStatus: string;
    reason: string;
  }>(`/hackathons/${hackathonId}/phases/force-transition`, {
    targetStatus,
    reason,
  });
  return response;
}

export async function triggerStatusCheck(): Promise<{
  message: string;
  updatedCount: number;
  processedCount: number;
}> {
  const response = await apiClient.post<{
    message: string;
    updatedCount: number;
    processedCount: number;
  }>("/hackathons/status/check", {});
  return response;
}

// Judge Dashboard API Functions
export interface JudgeHackathonAssignment {
  hackathon: {
    id: string;
    title: string;
    description: string;
    status: string;
    votingDeadline: string;
    createdAt: string;
  };
  votingProgress: {
    totalParticipants: number;
    completedVotes: number;
    pendingVotes: number;
    completionPercentage: number;
  };
  deadline: string;
  priority: "high" | "medium" | "low";
  daysUntilDeadline: number;
  isOverdue: boolean;
}

export interface JudgeDashboardData {
  assignedHackathons: JudgeHackathonAssignment[];
  totalAssigned: number;
  pendingHackathons: number;
  completedHackathons: number;
}

export interface JudgeVotingStatistics {
  totalVotesCast: number;
  totalHackathonsJudged: number;
  averageScore: number;
  votesWithComments: number;
  commentPercentage: number;
  lastVotingActivity?: string;
  scoreDistribution: Record<string, number>;
}

export interface ParticipantPreview {
  id: number;
  walletAddress: string;
  submissionUrl?: string;
  hasVoted: boolean;
  currentScore?: number;
  currentComment?: string;
}

export interface HackathonParticipantsPreview {
  hackathonId: string;
  participants: ParticipantPreview[];
  total: number;
}

export async function fetchJudgeAssignedHackathons(
  judgeAddress: string,
): Promise<JudgeDashboardData> {
  const response = await apiClient.get<JudgeDashboardData>(
    `/hackathons/judges/dashboard/${judgeAddress}`,
  );
  return response;
}

export async function fetchJudgeVotingProgress(
  judgeAddress: string,
  hackathonId: string,
): Promise<JudgeHackathonAssignment["votingProgress"]> {
  const response = await apiClient.get<
    JudgeHackathonAssignment["votingProgress"]
  >(`/hackathons/judges/${judgeAddress}/voting-progress/${hackathonId}`);
  return response;
}

export async function fetchJudgeVotingStatistics(
  judgeAddress: string,
): Promise<JudgeVotingStatistics> {
  const response = await apiClient.get<JudgeVotingStatistics>(
    `/hackathons/judges/${judgeAddress}/statistics`,
  );
  return response;
}

export async function fetchHackathonParticipantsPreview(
  hackathonId: string,
  judgeAddress: string,
): Promise<HackathonParticipantsPreview> {
  const response = await apiClient.get<HackathonParticipantsPreview>(
    `/hackathons/${hackathonId}/participants/preview/${judgeAddress}`,
  );
  return response;
}

// Results Export API Functions
export async function exportResults(
  hackathonId: string,
  format: "json" | "csv" = "json",
): Promise<ExportResultsResponse> {
  const response = await apiClient.get<ExportResultsResponse>(
    `/hackathons/${hackathonId}/winners/export`,
    { format },
  );
  return response;
}

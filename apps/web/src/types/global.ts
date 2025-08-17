// Global type definitions
export interface User {
  id: string;
  walletAddress: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Hackathon {
  id: string;
  title: string;
  description: string;
  organizerAddress: string;
  registrationDeadline: string;
  submissionDeadline: string;
  votingDeadline: string;
  status: HackathonStatus;
  prizeAmount?: string;
  entryFee?: string;
  maxParticipants?: number;
  coverImageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export enum HackathonStatus {
  DRAFT = "DRAFT",
  REGISTRATION_OPEN = "REGISTRATION_OPEN",
  REGISTRATION_CLOSED = "REGISTRATION_CLOSED",
  SUBMISSION_OPEN = "SUBMISSION_OPEN",
  SUBMISSION_CLOSED = "SUBMISSION_CLOSED",
  VOTING_OPEN = "VOTING_OPEN",
  VOTING_CLOSED = "VOTING_CLOSED",
  COMPLETED = "COMPLETED",
}

export interface Participant {
  id: string;
  hackathonId: string;
  userAddress: string;
  submissionUrl?: string;
  registeredAt: string;
}

export interface Vote {
  id: string;
  hackathonId: string;
  judgeAddress: string;
  participantAddress: string;
  score: number;
  comment?: string;
  createdAt: string;
}

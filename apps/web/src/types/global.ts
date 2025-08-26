// Global type definitions
export interface User {
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
  contractAddress?: string;
  participantCount: number;
  createdAt: string;
  updatedAt: string;
  participants?: Participant[];
  feeInfo?: HackathonFeeInfo;
}

export interface HackathonFeeInfo {
  lockedFeeRate: number; // Fee rate locked at creation (basis points)
  totalPrizePool: string; // Original prize pool amount before fees
  platformFee: string; // Platform fee amount
  distributionAmount: string; // Amount distributed to winners (after fee)
  platformFeeFormatted: string; // Formatted platform fee amount
  distributionAmountFormatted: string; // Formatted distribution amount
  tokenAddress?: string | null; // Token address for ERC20 prizes (null for native KAIA)
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
  id: number;
  hackathonId: string;
  walletAddress: string;
  submissionUrl?: string;
  entryFee?: string;
  rank?: number;
  prizeAmount?: string;
  createdAt: string;
}

export interface Vote {
  id: number;
  hackathonId: string;
  judgeAddress: string;
  participantAddress: string;
  score: number;
  comment?: string;
  createdAt: string;
}

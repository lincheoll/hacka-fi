import { Address } from 'viem';

// Wallet types
export interface WalletInfo {
  address: Address;
  isConnected: boolean;
  chainId?: number;
}

// Contract types
export interface HackathonInfo {
  title: string;
  description: string;
  organizer: Address;
  registrationDeadline: bigint;
  submissionDeadline: bigint;
  votingDeadline: bigint;
  status: number;
  participantCount: bigint;
  judgeCount: bigint;
}

export interface ParticipantInfo {
  submissionUrl: string;
  registrationTime: bigint;
  hasSubmitted: boolean;
}

export interface VotingStats {
  totalVotes: bigint;
  totalJudges: bigint;
  judgesWhoVoted: bigint;
  isVotingComplete: boolean;
}

export interface Winners {
  firstPlace: Address;
  secondPlace: Address;
  thirdPlace: Address;
}

export interface PrizePool {
  hackathonId: bigint;
  totalAmount: bigint;
  isDistributed: boolean;
  firstPlace: bigint;
  secondPlace: bigint;
  thirdPlace: bigint;
}

// Transaction types
export interface TransactionStatus {
  hash?: Address;
  status: 'idle' | 'pending' | 'success' | 'error';
  error?: string;
}
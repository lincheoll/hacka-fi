import { Address } from 'viem';

// HackathonRegistry Types
export interface HackathonInfo {
  title: string;
  description: string;
  organizer: Address;
  registrationDeadline: bigint;
  submissionDeadline: bigint;
  votingDeadline: bigint;
  status: HackathonStatus;
  participantCount: bigint;
  judgeCount: bigint;
}

export interface ParticipantInfo {
  submissionUrl: string;
  registrationTime: bigint;
  hasSubmitted: boolean;
}

export interface ParticipantScores {
  totalScore: bigint;
  voteCount: bigint;
  averageScore: bigint;
}

export interface Vote {
  score: number;
  comment: string;
  timestamp: bigint;
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

export interface Leaderboard {
  sortedParticipants: Address[];
  averageScores: bigint[];
}

// Enum for HackathonStatus
export enum HackathonStatus {
  Registration = 0,
  Submission = 1,
  Voting = 2,
  Completed = 3,
  Cancelled = 4,
}

// PrizePool Types
export interface PrizePool {
  hackathonId: bigint;
  totalAmount: bigint;
  isDistributed: boolean;
  firstPlace: bigint;
  secondPlace: bigint;
  thirdPlace: bigint;
}

export interface PrizeDistribution {
  hackathonId: bigint;
  firstPlace: Address;
  secondPlace: Address;
  thirdPlace: Address;
  firstPrize: bigint;
  secondPrize: bigint;
  thirdPrize: bigint;
  timestamp: bigint;
}

// Contract Event Types
export interface HackathonCreatedEvent {
  hackathonId: bigint;
  title: string;
  organizer: Address;
  registrationDeadline: bigint;
  submissionDeadline: bigint;
  votingDeadline: bigint;
}

export interface ParticipantRegisteredEvent {
  hackathonId: bigint;
  participant: Address;
  timestamp: bigint;
}

export interface VoteCastEvent {
  hackathonId: bigint;
  judge: Address;
  participant: Address;
  score: number;
  comment: string;
  timestamp: bigint;
}

export interface PrizeDistributedEvent {
  hackathonId: bigint;
  firstPlace: Address;
  secondPlace: Address;
  thirdPlace: Address;
  firstPrize: bigint;
  secondPrize: bigint;
  thirdPrize: bigint;
  timestamp: bigint;
}

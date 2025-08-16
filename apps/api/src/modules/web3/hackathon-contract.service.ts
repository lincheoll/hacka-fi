import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Address, Hash } from 'viem';
import { Web3Service } from './web3.service';
import {
  HACKATHON_REGISTRY_ABI,
  CONTRACT_ADDRESSES,
  HackathonInfo,
  ParticipantInfo,
  ParticipantScores,
  Vote,
  VotingStats,
  Winners,
  Leaderboard,
} from './contracts';

@Injectable()
export class HackathonContractService {
  private readonly logger = new Logger(HackathonContractService.name);
  private readonly hackathonRegistryAddress: Address;

  constructor(
    private readonly web3Service: Web3Service,
    private readonly configService: ConfigService,
  ) {
    this.hackathonRegistryAddress = this.configService.get<string>(
      'HACKATHON_REGISTRY_ADDRESS',
    ) as Address;

    if (!this.hackathonRegistryAddress) {
      throw new Error('HACKATHON_REGISTRY_ADDRESS is required');
    }
  }

  /**
   * Read Operations
   */

  async getCurrentHackathonId(): Promise<bigint> {
    const publicClient = this.web3Service.getPublicClient();

    try {
      const result = await publicClient.readContract({
        address: this.hackathonRegistryAddress,
        abi: HACKATHON_REGISTRY_ABI,
        functionName: 'getCurrentHackathonId',
      });

      return result as bigint;
    } catch (error) {
      this.logger.error('Failed to get current hackathon ID', error);
      throw error;
    }
  }

  async getHackathonInfo(hackathonId: bigint): Promise<HackathonInfo> {
    const publicClient = this.web3Service.getPublicClient();

    try {
      const result = await publicClient.readContract({
        address: this.hackathonRegistryAddress,
        abi: HACKATHON_REGISTRY_ABI,
        functionName: 'getHackathonInfo',
        args: [hackathonId],
      });

      const [
        title,
        description,
        organizer,
        registrationDeadline,
        submissionDeadline,
        votingDeadline,
        status,
        participantCount,
        judgeCount,
      ] = result as [
        string,
        string,
        Address,
        bigint,
        bigint,
        bigint,
        number,
        bigint,
        bigint,
      ];

      return {
        title,
        description,
        organizer,
        registrationDeadline,
        submissionDeadline,
        votingDeadline,
        status,
        participantCount,
        judgeCount,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get hackathon info for ID ${hackathonId}`,
        error,
      );
      throw error;
    }
  }

  async getParticipants(hackathonId: bigint): Promise<Address[]> {
    const publicClient = this.web3Service.getPublicClient();

    try {
      const result = await publicClient.readContract({
        address: this.hackathonRegistryAddress,
        abi: HACKATHON_REGISTRY_ABI,
        functionName: 'getParticipants',
        args: [hackathonId],
      });

      return result as Address[];
    } catch (error) {
      this.logger.error(
        `Failed to get participants for hackathon ${hackathonId}`,
        error,
      );
      throw error;
    }
  }

  async getParticipantInfo(
    hackathonId: bigint,
    participant: Address,
  ): Promise<ParticipantInfo> {
    const publicClient = this.web3Service.getPublicClient();

    try {
      const result = await publicClient.readContract({
        address: this.hackathonRegistryAddress,
        abi: HACKATHON_REGISTRY_ABI,
        functionName: 'getParticipantInfo',
        args: [hackathonId, participant],
      });

      const [submissionUrl, registrationTime, hasSubmitted] = result as [
        string,
        bigint,
        boolean,
      ];

      return {
        submissionUrl,
        registrationTime,
        hasSubmitted,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get participant info for ${participant}`,
        error,
      );
      throw error;
    }
  }

  async getParticipantScores(
    hackathonId: bigint,
    participant: Address,
  ): Promise<ParticipantScores> {
    const publicClient = this.web3Service.getPublicClient();

    try {
      const result = await publicClient.readContract({
        address: this.hackathonRegistryAddress,
        abi: HACKATHON_REGISTRY_ABI,
        functionName: 'getParticipantScores',
        args: [hackathonId, participant],
      });

      const [totalScore, voteCount, averageScore] = result as [
        bigint,
        bigint,
        bigint,
      ];

      return {
        totalScore,
        voteCount,
        averageScore,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get participant scores for ${participant}`,
        error,
      );
      throw error;
    }
  }

  async getVote(
    hackathonId: bigint,
    judge: Address,
    participant: Address,
  ): Promise<Vote> {
    const publicClient = this.web3Service.getPublicClient();

    try {
      const result = await publicClient.readContract({
        address: this.hackathonRegistryAddress,
        abi: HACKATHON_REGISTRY_ABI,
        functionName: 'getVote',
        args: [hackathonId, judge, participant],
      });

      const [score, comment, timestamp] = result as [number, string, bigint];

      return {
        score,
        comment,
        timestamp,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get vote from ${judge} for ${participant}`,
        error,
      );
      throw error;
    }
  }

  async getVotingStats(hackathonId: bigint): Promise<VotingStats> {
    const publicClient = this.web3Service.getPublicClient();

    try {
      const result = await publicClient.readContract({
        address: this.hackathonRegistryAddress,
        abi: HACKATHON_REGISTRY_ABI,
        functionName: 'getVotingStats',
        args: [hackathonId],
      });

      const [totalVotes, totalJudges, judgesWhoVoted, isVotingComplete] =
        result as [bigint, bigint, bigint, boolean];

      return {
        totalVotes,
        totalJudges,
        judgesWhoVoted,
        isVotingComplete,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get voting stats for hackathon ${hackathonId}`,
        error,
      );
      throw error;
    }
  }

  async getWinners(hackathonId: bigint): Promise<Winners> {
    const publicClient = this.web3Service.getPublicClient();

    try {
      const result = await publicClient.readContract({
        address: this.hackathonRegistryAddress,
        abi: HACKATHON_REGISTRY_ABI,
        functionName: 'getWinners',
        args: [hackathonId],
      });

      const [firstPlace, secondPlace, thirdPlace] = result as [
        Address,
        Address,
        Address,
      ];

      return {
        firstPlace,
        secondPlace,
        thirdPlace,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get winners for hackathon ${hackathonId}`,
        error,
      );
      throw error;
    }
  }

  async getLeaderboard(hackathonId: bigint): Promise<Leaderboard> {
    const publicClient = this.web3Service.getPublicClient();

    try {
      const result = await publicClient.readContract({
        address: this.hackathonRegistryAddress,
        abi: HACKATHON_REGISTRY_ABI,
        functionName: 'getLeaderboard',
        args: [hackathonId],
      });

      const [sortedParticipants, averageScores] = result as [
        Address[],
        bigint[],
      ];

      return {
        sortedParticipants,
        averageScores,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get leaderboard for hackathon ${hackathonId}`,
        error,
      );
      throw error;
    }
  }

  async isJudge(hackathonId: bigint, judge: Address): Promise<boolean> {
    const publicClient = this.web3Service.getPublicClient();

    try {
      const result = await publicClient.readContract({
        address: this.hackathonRegistryAddress,
        abi: HACKATHON_REGISTRY_ABI,
        functionName: 'isJudge',
        args: [hackathonId, judge],
      });

      return result as boolean;
    } catch (error) {
      this.logger.error(
        `Failed to check if ${judge} is a judge for hackathon ${hackathonId}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Write Operations (require wallet)
   */

  async createHackathon(
    title: string,
    description: string,
    registrationDeadline: bigint,
    submissionDeadline: bigint,
    votingDeadline: bigint,
  ): Promise<Hash> {
    const walletClient = this.web3Service.getWalletClient();

    try {
      const hash = await walletClient.writeContract({
        address: this.hackathonRegistryAddress,
        abi: HACKATHON_REGISTRY_ABI,
        functionName: 'createHackathon',
        args: [
          title,
          description,
          registrationDeadline,
          submissionDeadline,
          votingDeadline,
        ],
        chain: this.web3Service.getChain(),
        account: this.web3Service.getWalletAccount(),
      });

      this.logger.log(`Hackathon creation transaction submitted: ${hash}`);
      return hash;
    } catch (error) {
      this.logger.error('Failed to create hackathon', error);
      throw error;
    }
  }

  async registerParticipant(hackathonId: bigint): Promise<Hash> {
    const walletClient = this.web3Service.getWalletClient();

    try {
      const hash = await walletClient.writeContract({
        address: this.hackathonRegistryAddress,
        abi: HACKATHON_REGISTRY_ABI,
        functionName: 'registerParticipant',
        args: [hackathonId],
        chain: this.web3Service.getChain(),
        account: this.web3Service.getWalletAccount(),
      });

      this.logger.log(
        `Participant registration transaction submitted: ${hash}`,
      );
      return hash;
    } catch (error) {
      this.logger.error(
        `Failed to register participant for hackathon ${hackathonId}`,
        error,
      );
      throw error;
    }
  }

  async updateSubmission(
    hackathonId: bigint,
    submissionUrl: string,
  ): Promise<Hash> {
    const walletClient = this.web3Service.getWalletClient();

    try {
      const hash = await walletClient.writeContract({
        address: this.hackathonRegistryAddress,
        abi: HACKATHON_REGISTRY_ABI,
        functionName: 'updateSubmission',
        args: [hackathonId, submissionUrl],
        chain: this.web3Service.getChain(),
        account: this.web3Service.getWalletAccount(),
      });

      this.logger.log(`Submission update transaction submitted: ${hash}`);
      return hash;
    } catch (error) {
      this.logger.error(
        `Failed to update submission for hackathon ${hackathonId}`,
        error,
      );
      throw error;
    }
  }

  async addJudge(hackathonId: bigint, judge: Address): Promise<Hash> {
    const walletClient = this.web3Service.getWalletClient();

    try {
      const hash = await walletClient.writeContract({
        address: this.hackathonRegistryAddress,
        abi: HACKATHON_REGISTRY_ABI,
        functionName: 'addJudge',
        args: [hackathonId, judge],
        chain: this.web3Service.getChain(),
        account: this.web3Service.getWalletAccount(),
      });

      this.logger.log(`Judge addition transaction submitted: ${hash}`);
      return hash;
    } catch (error) {
      this.logger.error(
        `Failed to add judge ${judge} to hackathon ${hackathonId}`,
        error,
      );
      throw error;
    }
  }

  async castVote(
    hackathonId: bigint,
    participant: Address,
    score: number,
    comment: string,
  ): Promise<Hash> {
    const walletClient = this.web3Service.getWalletClient();

    try {
      const hash = await walletClient.writeContract({
        address: this.hackathonRegistryAddress,
        abi: HACKATHON_REGISTRY_ABI,
        functionName: 'castVote',
        args: [hackathonId, participant, score, comment],
        chain: this.web3Service.getChain(),
        account: this.web3Service.getWalletAccount(),
      });

      this.logger.log(`Vote casting transaction submitted: ${hash}`);
      return hash;
    } catch (error) {
      this.logger.error(
        `Failed to cast vote for participant ${participant}`,
        error,
      );
      throw error;
    }
  }

  async startVotingPhase(hackathonId: bigint): Promise<Hash> {
    const walletClient = this.web3Service.getWalletClient();

    try {
      const hash = await walletClient.writeContract({
        address: this.hackathonRegistryAddress,
        abi: HACKATHON_REGISTRY_ABI,
        functionName: 'startVotingPhase',
        args: [hackathonId],
        chain: this.web3Service.getChain(),
        account: this.web3Service.getWalletAccount(),
      });

      this.logger.log(`Voting phase start transaction submitted: ${hash}`);
      return hash;
    } catch (error) {
      this.logger.error(
        `Failed to start voting phase for hackathon ${hackathonId}`,
        error,
      );
      throw error;
    }
  }

  async completeVoting(hackathonId: bigint): Promise<Hash> {
    const walletClient = this.web3Service.getWalletClient();

    try {
      const hash = await walletClient.writeContract({
        address: this.hackathonRegistryAddress,
        abi: HACKATHON_REGISTRY_ABI,
        functionName: 'completeVoting',
        args: [hackathonId],
        chain: this.web3Service.getChain(),
        account: this.web3Service.getWalletAccount(),
      });

      this.logger.log(`Voting completion transaction submitted: ${hash}`);
      return hash;
    } catch (error) {
      this.logger.error(
        `Failed to complete voting for hackathon ${hackathonId}`,
        error,
      );
      throw error;
    }
  }
}

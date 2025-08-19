import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { CastVoteDto } from '../hackathon/dto/vote.dto';
import { HackathonStatus } from '@prisma/client';

export interface VoteValidationResult {
  isValid: boolean;
  error?: string;
  errorCode?: string;
  metadata?: Record<string, any>;
}

export interface VoteValidationContext {
  hackathonId: string;
  judgeAddress: string;
  castVoteDto: CastVoteDto;
}

@Injectable()
export class VoteValidationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Comprehensive vote validation
   */
  async validateVote(
    context: VoteValidationContext,
  ): Promise<VoteValidationResult> {
    const { hackathonId, judgeAddress, castVoteDto } = context;

    // 1. Validate hackathon exists and get details
    const hackathon = await this.prisma.hackathon.findUnique({
      where: { id: hackathonId },
      include: {
        participants: {
          where: { id: castVoteDto.participantId },
        },
      },
    });

    if (!hackathon) {
      return {
        isValid: false,
        error: `Hackathon with ID ${hackathonId} not found`,
        errorCode: 'HACKATHON_NOT_FOUND',
      };
    }

    // 2. Validate hackathon status
    const statusValidation = this.validateHackathonStatus(hackathon);
    if (!statusValidation.isValid) {
      return statusValidation;
    }

    // 3. Validate voting period
    const periodValidation = this.validateVotingPeriod(hackathon);
    if (!periodValidation.isValid) {
      return periodValidation;
    }

    // 4. Validate judge authorization
    const judgeValidation = await this.validateJudgeAuthorization(
      hackathonId,
      judgeAddress,
    );
    if (!judgeValidation.isValid) {
      return judgeValidation;
    }

    // 5. Validate participant
    const participantValidation = this.validateParticipant(
      hackathon,
      castVoteDto.participantId,
    );
    if (!participantValidation.isValid) {
      return participantValidation;
    }

    // 6. Validate vote data
    const voteDataValidation = this.validateVoteData(castVoteDto);
    if (!voteDataValidation.isValid) {
      return voteDataValidation;
    }

    // 7. Validate business rules
    const businessRuleValidation = await this.validateBusinessRules(context);
    if (!businessRuleValidation.isValid) {
      return businessRuleValidation;
    }

    return {
      isValid: true,
      metadata: {
        hackathonTitle: hackathon.title,
        participant: hackathon.participants[0],
        isUpdate: await this.isExistingVote(
          hackathonId,
          judgeAddress,
          castVoteDto.participantId,
        ),
      },
    };
  }

  /**
   * Validate hackathon status
   */
  private validateHackathonStatus(hackathon: any): VoteValidationResult {
    if (hackathon.status !== HackathonStatus.VOTING_OPEN) {
      return {
        isValid: false,
        error: `Hackathon is not in voting phase. Current status: ${hackathon.status}`,
        errorCode: 'INVALID_HACKATHON_STATUS',
        metadata: { currentStatus: hackathon.status },
      };
    }

    return { isValid: true };
  }

  /**
   * Validate voting period timing
   */
  private validateVotingPeriod(hackathon: any): VoteValidationResult {
    const now = new Date();

    // Check if voting has started (submission deadline passed)
    if (now < hackathon.submissionDeadline) {
      return {
        isValid: false,
        error:
          'Voting has not started yet. Voting begins after submission deadline.',
        errorCode: 'VOTING_NOT_STARTED',
        metadata: {
          submissionDeadline: hackathon.submissionDeadline,
          timeUntilVotingStart:
            hackathon.submissionDeadline.getTime() - now.getTime(),
        },
      };
    }

    // Check if voting deadline has passed
    if (now > hackathon.votingDeadline) {
      return {
        isValid: false,
        error: 'Voting deadline has passed',
        errorCode: 'VOTING_DEADLINE_PASSED',
        metadata: {
          votingDeadline: hackathon.votingDeadline,
          timeSinceDeadline: now.getTime() - hackathon.votingDeadline.getTime(),
        },
      };
    }

    return { isValid: true };
  }

  /**
   * Validate judge authorization
   */
  private async validateJudgeAuthorization(
    hackathonId: string,
    judgeAddress: string,
  ): Promise<VoteValidationResult> {
    const judge = await this.prisma.hackathonJudge.findUnique({
      where: {
        hackathonId_judgeAddress: {
          hackathonId,
          judgeAddress,
        },
      },
      include: {
        judge: {
          select: {
            walletAddress: true,
            username: true,
          },
        },
      },
    });

    if (!judge) {
      return {
        isValid: false,
        error: 'Only authorized judges can vote in this hackathon',
        errorCode: 'JUDGE_NOT_AUTHORIZED',
        metadata: { judgeAddress },
      };
    }

    // Additional check: ensure judge is still active (not removed after being added)
    // This covers edge cases where judge might have been removed after initial whitelist
    const isJudgeActive = await this.isJudgeStillActive(
      hackathonId,
      judgeAddress,
    );
    if (!isJudgeActive) {
      return {
        isValid: false,
        error: 'Judge authorization has been revoked',
        errorCode: 'JUDGE_AUTHORIZATION_REVOKED',
        metadata: { judgeAddress },
      };
    }

    return {
      isValid: true,
      metadata: { judgeInfo: judge.judge },
    };
  }

  /**
   * Validate participant exists and is eligible for voting
   */
  private validateParticipant(
    hackathon: any,
    participantId: number,
  ): VoteValidationResult {
    const participant = hackathon.participants.find(
      (p: any) => p.id === participantId,
    );

    if (!participant) {
      return {
        isValid: false,
        error: 'Participant not found in this hackathon',
        errorCode: 'PARTICIPANT_NOT_FOUND',
        metadata: { participantId },
      };
    }

    // Check if participant has a submission (only participants with submissions can be voted on)
    if (!participant.submissionUrl) {
      return {
        isValid: false,
        error: 'Cannot vote for participant without submission',
        errorCode: 'NO_SUBMISSION',
        metadata: {
          participantId,
          participantAddress: participant.userAddress,
        },
      };
    }

    return {
      isValid: true,
      metadata: { participant },
    };
  }

  /**
   * Validate vote data (score, comment)
   */
  private validateVoteData(castVoteDto: CastVoteDto): VoteValidationResult {
    // Score validation (should be handled by DTO validation, but double-check)
    if (castVoteDto.score < 1 || castVoteDto.score > 10) {
      return {
        isValid: false,
        error: 'Score must be between 1 and 10',
        errorCode: 'INVALID_SCORE_RANGE',
        metadata: { providedScore: castVoteDto.score },
      };
    }

    // Comment length validation
    if (castVoteDto.comment && castVoteDto.comment.length > 1000) {
      return {
        isValid: false,
        error: 'Comment must not exceed 1000 characters',
        errorCode: 'COMMENT_TOO_LONG',
        metadata: { commentLength: castVoteDto.comment.length },
      };
    }

    // Check for inappropriate content (basic validation)
    if (
      castVoteDto.comment &&
      this.containsInappropriateContent(castVoteDto.comment)
    ) {
      return {
        isValid: false,
        error: 'Comment contains inappropriate content',
        errorCode: 'INAPPROPRIATE_CONTENT',
      };
    }

    return { isValid: true };
  }

  /**
   * Validate business rules
   */
  private async validateBusinessRules(
    context: VoteValidationContext,
  ): Promise<VoteValidationResult> {
    const { hackathonId, judgeAddress, castVoteDto } = context;

    // Rule 1: Judge cannot vote for their own submission
    const isOwnSubmission = await this.isJudgeVotingForOwnSubmission(
      hackathonId,
      judgeAddress,
      castVoteDto.participantId,
    );

    if (isOwnSubmission) {
      return {
        isValid: false,
        error: 'Judges cannot vote for their own submissions',
        errorCode: 'SELF_VOTING_PROHIBITED',
      };
    }

    // Rule 2: Check voting rate limits (prevent spam)
    const rateLimitValidation = await this.validateRateLimit(
      hackathonId,
      judgeAddress,
    );
    if (!rateLimitValidation.isValid) {
      return rateLimitValidation;
    }

    return { isValid: true };
  }

  /**
   * Check if judge is voting for their own submission
   */
  private async isJudgeVotingForOwnSubmission(
    hackathonId: string,
    judgeAddress: string,
    participantId: number,
  ): Promise<boolean> {
    const participant = await this.prisma.participant.findFirst({
      where: {
        id: participantId,
        hackathonId,
        walletAddress: judgeAddress,
      },
    });

    return !!participant;
  }

  /**
   * Check if judge is still active (not removed)
   */
  private async isJudgeStillActive(
    hackathonId: string,
    judgeAddress: string,
  ): Promise<boolean> {
    const judge = await this.prisma.hackathonJudge.findUnique({
      where: {
        hackathonId_judgeAddress: {
          hackathonId,
          judgeAddress,
        },
      },
    });

    return !!judge;
  }

  /**
   * Check if this is an update to existing vote
   */
  async isExistingVote(
    hackathonId: string,
    judgeAddress: string,
    participantId: number,
  ): Promise<boolean> {
    const existingVote = await this.prisma.vote.findUnique({
      where: {
        hackathonId_judgeAddress_participantId: {
          hackathonId,
          judgeAddress,
          participantId,
        },
      },
    });

    return !!existingVote;
  }

  /**
   * Validate rate limiting to prevent spam voting
   */
  private async validateRateLimit(
    hackathonId: string,
    judgeAddress: string,
  ): Promise<VoteValidationResult> {
    // Check how many votes this judge has cast in the last minute
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

    const recentVotes = await this.prisma.vote.count({
      where: {
        hackathonId,
        judgeAddress,
        createdAt: {
          gte: oneMinuteAgo,
        },
      },
    });

    // Allow maximum 10 votes per minute per judge
    if (recentVotes >= 10) {
      return {
        isValid: false,
        error: 'Too many votes submitted. Please wait before voting again.',
        errorCode: 'RATE_LIMIT_EXCEEDED',
        metadata: { recentVotes, timeWindow: '1 minute' },
      };
    }

    return { isValid: true };
  }

  /**
   * Basic inappropriate content detection
   */
  private containsInappropriateContent(comment: string): boolean {
    // Basic implementation - in production, you might want to use a more sophisticated content filter
    const inappropriateWords = ['spam', 'scam', 'fake', 'cheat'];
    const lowerComment = comment.toLowerCase();

    return inappropriateWords.some((word) => lowerComment.includes(word));
  }

  /**
   * Get detailed validation error for throwing appropriate exceptions
   */
  getValidationException(result: VoteValidationResult): Error {
    if (!result.error || !result.errorCode) {
      throw new Error('Invalid validation result');
    }

    switch (result.errorCode) {
      case 'HACKATHON_NOT_FOUND':
      case 'PARTICIPANT_NOT_FOUND':
        return new NotFoundException(result.error);

      case 'JUDGE_NOT_AUTHORIZED':
      case 'JUDGE_AUTHORIZATION_REVOKED':
      case 'SELF_VOTING_PROHIBITED':
        return new ForbiddenException(result.error);

      default:
        return new BadRequestException(result.error);
    }
  }
}

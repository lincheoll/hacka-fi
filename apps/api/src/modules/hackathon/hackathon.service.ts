import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { RankingService } from './ranking.service';
import {
  WinnerDeterminationService,
  WinnerDeterminationResult,
} from './winner-determination.service';
import { VoteValidationService } from '../voting/vote-validation.service';
import { AuditService } from '../audit/audit.service';
import { ConfigService } from '@nestjs/config';
import {
  HackathonStatus,
  Prisma,
  AuditAction,
  TriggerType,
} from '@prisma/client';
import { PrismaService } from '../../common/database/prisma.service';
import {
  CreateHackathonDto,
  UpdateHackathonDto,
  QueryHackathonDto,
  ParticipateHackathonDto,
  HackathonResponseDto,
  ParticipantResponseDto,
  AddJudgeDto,
  RemoveJudgeDto,
  JudgeResponseDto,
  JudgeListResponseDto,
  CastVoteDto,
  VoteResponseDto,
  HackathonVotingResultsDto,
  RankingMetricsDto,
  JudgeDashboardResponseDto,
  JudgeHackathonAssignmentDto,
  JudgeVotingStatisticsDto,
  VotingProgressDto,
  HackathonParticipantsPreviewDto,
  ParticipantPreviewDto,
} from './dto';

@Injectable()
export class HackathonService {
  private readonly logger = new Logger(HackathonService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly rankingService: RankingService,
    private readonly winnerDeterminationService: WinnerDeterminationService,
    private readonly voteValidationService: VoteValidationService,
    private readonly auditService: AuditService,
  ) {}

  async createHackathon(
    createHackathonDto: CreateHackathonDto,
    creatorAddress: string,
  ): Promise<HackathonResponseDto> {
    this.logger.log(`Creating hackathon by ${creatorAddress}`);

    // Validate deadline is in the future
    const deadline = new Date(createHackathonDto.deadline);
    if (deadline <= new Date()) {
      throw new BadRequestException('Deadline must be in the future');
    }

    // Ensure user profile exists
    await this.ensureUserProfileExists(creatorAddress);

    const hackathon = await this.prisma.hackathon.create({
      data: {
        title: createHackathonDto.title,
        description: createHackathonDto.description,
        registrationDeadline: deadline,
        submissionDeadline: deadline, // For now, use same deadline for backwards compatibility
        votingDeadline: new Date(deadline.getTime() + 7 * 24 * 60 * 60 * 1000), // Add 7 days
        organizerAddress: creatorAddress,
        status: HackathonStatus.DRAFT,
      },
      include: {
        _count: {
          select: { participants: true },
        },
      },
    });

    this.logger.log(`Created hackathon ${hackathon.id}`);
    return this.mapToResponseDto(hackathon);
  }

  async findAll(queryDto: QueryHackathonDto): Promise<{
    data: HackathonResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = queryDto;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.HackathonWhereInput = {};

    if (queryDto.status) {
      where.status = queryDto.status;
    }

    if (queryDto.creator) {
      where.organizerAddress = queryDto.creator;
    }

    if (queryDto.search) {
      // Case-insensitive search handling based on database provider
      const dbProvider = this.getDatabaseProvider();
      const searchOptions = this.getSearchOptions(queryDto.search, dbProvider);

      where.OR = [{ title: searchOptions }, { description: searchOptions }];
    }

    // Get total count for pagination
    const total = await this.prisma.hackathon.count({ where });

    // Get hackathons with pagination
    const hackathons = await this.prisma.hackathon.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        _count: {
          select: { participants: true },
        },
      },
    });

    const data = hackathons.map((hackathon) =>
      this.mapToResponseDto(hackathon),
    );
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      total,
      page,
      limit,
      totalPages,
    };
  }

  async findOne(
    id: string,
    includeParticipants = false,
  ): Promise<HackathonResponseDto> {
    const hackathon = await this.prisma.hackathon.findUnique({
      where: { id },
      include: {
        _count: {
          select: { participants: true },
        },
        participants: includeParticipants
          ? {
              select: {
                id: true,
                walletAddress: true,
                submissionUrl: true,
                entryFee: true,
                rank: true,
                prizeAmount: true,
                createdAt: true,
              },
              orderBy: { createdAt: 'asc' },
            }
          : false,
      },
    });

    if (!hackathon) {
      throw new NotFoundException(`Hackathon with ID ${id} not found`);
    }

    return this.mapToResponseDto(hackathon, includeParticipants);
  }

  async updateHackathon(
    id: string,
    updateHackathonDto: UpdateHackathonDto,
    updaterAddress: string,
  ): Promise<HackathonResponseDto> {
    const existingHackathon = await this.prisma.hackathon.findUnique({
      where: { id },
    });

    if (!existingHackathon) {
      throw new NotFoundException(`Hackathon with ID ${id} not found`);
    }

    // Only creator can update
    if (existingHackathon.organizerAddress !== updaterAddress) {
      throw new ForbiddenException(
        'Only the creator can update this hackathon',
      );
    }

    // Validate status transitions and prepare for audit logging
    let statusChanged = false;
    const oldStatus = existingHackathon.status;
    const newStatus = updateHackathonDto.status;

    if (newStatus && oldStatus !== newStatus) {
      this.validateStatusTransition(oldStatus, newStatus);
      statusChanged = true;
    }

    // Validate deadline if being updated
    if (updateHackathonDto.deadline) {
      const newDeadline = new Date(updateHackathonDto.deadline);
      if (newDeadline <= new Date()) {
        throw new BadRequestException('Deadline must be in the future');
      }
    }

    const updateData: Prisma.HackathonUpdateInput = {};

    if (updateHackathonDto.title) updateData.title = updateHackathonDto.title;
    if (updateHackathonDto.description)
      updateData.description = updateHackathonDto.description;
    if (updateHackathonDto.deadline)
      updateData.submissionDeadline = new Date(updateHackathonDto.deadline);
    // Note: lotteryPercentage removed from new schema
    if (updateHackathonDto.status)
      updateData.status = updateHackathonDto.status;
    if (updateHackathonDto.contractAddress) {
      updateData.contractAddress = updateHackathonDto.contractAddress;
    }

    const updatedHackathon = await this.prisma.hackathon.update({
      where: { id },
      data: updateData,
      include: {
        _count: {
          select: { participants: true },
        },
      },
    });

    // Log audit trail for status changes
    if (statusChanged && newStatus) {
      try {
        await this.auditService.logManualOverride(
          id,
          oldStatus,
          newStatus,
          `Status manually changed by organizer: ${existingHackathon.title}`,
          updaterAddress,
        );
        this.logger.log(
          `Status change logged: ${oldStatus} → ${newStatus} for hackathon ${id}`,
        );
      } catch (auditError) {
        this.logger.error('Failed to log status change audit:', {
          error:
            auditError instanceof Error
              ? auditError.message
              : String(auditError),
          hackathonId: id,
          fromStatus: oldStatus,
          toStatus: newStatus,
        });
        // Don't fail the update if audit logging fails
      }
    }

    this.logger.log(`Updated hackathon ${id} by ${updaterAddress}`);
    return this.mapToResponseDto(updatedHackathon);
  }

  async deleteHackathon(id: string, deleterAddress: string): Promise<void> {
    const hackathon = await this.prisma.hackathon.findUnique({
      where: { id },
    });

    if (!hackathon) {
      throw new NotFoundException(`Hackathon with ID ${id} not found`);
    }

    // Only creator can delete
    if (hackathon.organizerAddress !== deleterAddress) {
      throw new ForbiddenException(
        'Only the creator can delete this hackathon',
      );
    }

    // Cannot delete if hackathon is in active states
    if (
      hackathon.status === HackathonStatus.SUBMISSION_OPEN ||
      hackathon.status === HackathonStatus.VOTING_OPEN ||
      hackathon.status === HackathonStatus.REGISTRATION_OPEN
    ) {
      throw new BadRequestException(
        'Cannot delete hackathon that is active or in progress',
      );
    }

    // Simply delete the hackathon (no CANCELLED status in new schema)
    await this.prisma.hackathon.delete({
      where: { id },
    });

    this.logger.log(`Soft deleted hackathon ${id} by ${deleterAddress}`);
  }

  async participateInHackathon(
    hackathonId: string,
    participantAddress: string,
    participateDto: ParticipateHackathonDto,
  ): Promise<ParticipantResponseDto> {
    const hackathon = await this.prisma.hackathon.findUnique({
      where: { id: hackathonId },
    });

    if (!hackathon) {
      throw new NotFoundException(`Hackathon with ID ${hackathonId} not found`);
    }

    // Check if hackathon is accepting participants
    if (hackathon.status !== HackathonStatus.REGISTRATION_OPEN) {
      throw new BadRequestException('Hackathon is not accepting participants');
    }

    // Check deadline
    if (new Date() > hackathon.submissionDeadline) {
      throw new BadRequestException('Hackathon deadline has passed');
    }

    // Creator cannot participate in their own hackathon
    if (hackathon.organizerAddress === participantAddress) {
      throw new BadRequestException(
        'Creator cannot participate in their own hackathon',
      );
    }

    // Check if already participating
    const existingParticipant = await this.prisma.participant.findUnique({
      where: {
        hackathonId_walletAddress: {
          hackathonId,
          walletAddress: participantAddress,
        },
      },
    });

    if (existingParticipant) {
      throw new ConflictException('Already participating in this hackathon');
    }

    // Ensure user profile exists
    await this.ensureUserProfileExists(participantAddress);

    const participant = await this.prisma.participant.create({
      data: {
        hackathonId,
        walletAddress: participantAddress,
        submissionUrl: participateDto.submissionUrl ?? null,
        entryFee: participateDto.entryFee ?? null,
      },
    });

    this.logger.log(
      `User ${participantAddress} joined hackathon ${hackathonId}`,
    );

    return {
      id: participant.id,
      walletAddress: participant.walletAddress,
      submissionUrl: participant.submissionUrl ?? undefined,
      entryFee: participant.entryFee ?? undefined,
      rank: participant.rank ?? undefined,
      prizeAmount: participant.prizeAmount ?? undefined,
      createdAt: participant.createdAt.toISOString(),
    };
  }

  private validateStatusTransition(
    currentStatus: HackathonStatus,
    newStatus: HackathonStatus,
  ): void {
    const validTransitions: Record<HackathonStatus, HackathonStatus[]> = {
      [HackathonStatus.DRAFT]: [HackathonStatus.REGISTRATION_OPEN],
      [HackathonStatus.REGISTRATION_OPEN]: [
        HackathonStatus.REGISTRATION_CLOSED,
        HackathonStatus.SUBMISSION_OPEN,
      ],
      [HackathonStatus.REGISTRATION_CLOSED]: [HackathonStatus.SUBMISSION_OPEN],
      [HackathonStatus.SUBMISSION_OPEN]: [HackathonStatus.SUBMISSION_CLOSED],
      [HackathonStatus.SUBMISSION_CLOSED]: [HackathonStatus.VOTING_OPEN],
      [HackathonStatus.VOTING_OPEN]: [HackathonStatus.VOTING_CLOSED],
      [HackathonStatus.VOTING_CLOSED]: [HackathonStatus.COMPLETED],
      [HackathonStatus.COMPLETED]: [],
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }

  private async ensureUserProfileExists(walletAddress: string): Promise<void> {
    const existingProfile = await this.prisma.userProfile.findUnique({
      where: { walletAddress },
    });

    if (!existingProfile) {
      await this.prisma.userProfile.create({
        data: { walletAddress },
      });
      this.logger.log(`Created user profile for ${walletAddress}`);
    }
  }

  // Judge Management Methods

  async addJudge(
    hackathonId: string,
    addJudgeDto: AddJudgeDto,
    addedBy: string,
  ): Promise<JudgeResponseDto> {
    const hackathon = await this.prisma.hackathon.findUnique({
      where: { id: hackathonId },
    });

    if (!hackathon) {
      throw new NotFoundException(`Hackathon with ID ${hackathonId} not found`);
    }

    // Only organizer can add judges
    if (hackathon.organizerAddress !== addedBy) {
      throw new ForbiddenException(
        'Only the hackathon organizer can add judges',
      );
    }

    // Cannot add judges during voting or after completion
    if (
      hackathon.status === HackathonStatus.VOTING_OPEN ||
      hackathon.status === HackathonStatus.VOTING_CLOSED ||
      hackathon.status === HackathonStatus.COMPLETED
    ) {
      throw new BadRequestException('Cannot add judges during or after voting');
    }

    // Ensure judge profile exists
    await this.ensureUserProfileExists(addJudgeDto.judgeAddress);

    // Check if judge already exists
    const existingJudge = await this.prisma.hackathonJudge.findUnique({
      where: {
        hackathonId_judgeAddress: {
          hackathonId,
          judgeAddress: addJudgeDto.judgeAddress,
        },
      },
    });

    if (existingJudge) {
      throw new ConflictException('Judge already added to this hackathon');
    }

    // Organizer cannot be a judge of their own hackathon
    if (hackathon.organizerAddress === addJudgeDto.judgeAddress) {
      throw new BadRequestException(
        'Organizer cannot be a judge of their own hackathon',
      );
    }

    const judge = await this.prisma.hackathonJudge.create({
      data: {
        hackathonId,
        judgeAddress: addJudgeDto.judgeAddress,
        addedBy,
      },
      include: {
        judge: {
          select: {
            walletAddress: true,
            username: true,
            bio: true,
            avatarUrl: true,
          },
        },
      },
    });

    this.logger.log(
      `Judge ${addJudgeDto.judgeAddress} added to hackathon ${hackathonId} by ${addedBy}`,
    );

    return {
      id: judge.id,
      hackathonId: judge.hackathonId,
      judgeAddress: judge.judgeAddress,
      addedBy: judge.addedBy,
      addedAt: judge.addedAt,
      judge: judge.judge,
    };
  }

  async removeJudge(
    hackathonId: string,
    removeJudgeDto: RemoveJudgeDto,
    removedBy: string,
  ): Promise<void> {
    const hackathon = await this.prisma.hackathon.findUnique({
      where: { id: hackathonId },
    });

    if (!hackathon) {
      throw new NotFoundException(`Hackathon with ID ${hackathonId} not found`);
    }

    // Only organizer can remove judges
    if (hackathon.organizerAddress !== removedBy) {
      throw new ForbiddenException(
        'Only the hackathon organizer can remove judges',
      );
    }

    // Cannot remove judges during voting
    if (hackathon.status === HackathonStatus.VOTING_OPEN) {
      throw new BadRequestException('Cannot remove judges during voting');
    }

    const judge = await this.prisma.hackathonJudge.findUnique({
      where: {
        hackathonId_judgeAddress: {
          hackathonId,
          judgeAddress: removeJudgeDto.judgeAddress,
        },
      },
    });

    if (!judge) {
      throw new NotFoundException('Judge not found in this hackathon');
    }

    // If voting has completed, check if judge has already voted
    if (
      hackathon.status === HackathonStatus.VOTING_CLOSED ||
      hackathon.status === HackathonStatus.COMPLETED
    ) {
      const existingVotes = await this.prisma.vote.findMany({
        where: {
          hackathonId,
          judgeAddress: removeJudgeDto.judgeAddress,
        },
      });

      if (existingVotes.length > 0) {
        throw new BadRequestException(
          'Cannot remove judge who has already cast votes',
        );
      }
    }

    await this.prisma.hackathonJudge.delete({
      where: {
        hackathonId_judgeAddress: {
          hackathonId,
          judgeAddress: removeJudgeDto.judgeAddress,
        },
      },
    });

    this.logger.log(
      `Judge ${removeJudgeDto.judgeAddress} removed from hackathon ${hackathonId} by ${removedBy}`,
    );
  }

  async getJudges(hackathonId: string): Promise<JudgeListResponseDto> {
    const hackathon = await this.prisma.hackathon.findUnique({
      where: { id: hackathonId },
    });

    if (!hackathon) {
      throw new NotFoundException(`Hackathon with ID ${hackathonId} not found`);
    }

    const judges = await this.prisma.hackathonJudge.findMany({
      where: { hackathonId },
      include: {
        judge: {
          select: {
            walletAddress: true,
            username: true,
            bio: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { addedAt: 'asc' },
    });

    return {
      judges: judges.map((judge) => ({
        id: judge.id,
        hackathonId: judge.hackathonId,
        judgeAddress: judge.judgeAddress,
        addedBy: judge.addedBy,
        addedAt: judge.addedAt,
        judge: judge.judge,
      })),
      count: judges.length,
    };
  }

  // Voting Methods

  async castVote(
    hackathonId: string,
    castVoteDto: CastVoteDto,
    judgeAddress: string,
  ): Promise<VoteResponseDto> {
    this.logger.log(
      `Vote attempt by judge ${judgeAddress} for participant ${castVoteDto.participantId} in hackathon ${hackathonId}`,
    );

    // Comprehensive validation using VoteValidationService
    const validationResult = await this.voteValidationService.validateVote({
      hackathonId,
      judgeAddress,
      castVoteDto,
    });

    if (!validationResult.isValid) {
      this.logger.warn(
        `Vote validation failed: ${validationResult.error} (Code: ${validationResult.errorCode})`,
        {
          hackathonId,
          judgeAddress,
          participantId: castVoteDto.participantId,
          metadata: validationResult.metadata,
        },
      );

      // Throw appropriate exception based on validation result
      throw this.voteValidationService.getValidationException(validationResult);
    }

    this.logger.log(`Vote validation passed for judge ${judgeAddress}`, {
      metadata: validationResult.metadata,
    });

    // Check if this is an update or new vote
    const isUpdate = validationResult.metadata?.isUpdate || false;

    try {
      if (isUpdate) {
        // Update existing vote
        const existingVote = await this.prisma.vote.findUnique({
          where: {
            hackathonId_judgeAddress_participantId: {
              hackathonId,
              judgeAddress,
              participantId: castVoteDto.participantId,
            },
          },
        });

        if (!existingVote) {
          throw new NotFoundException('Existing vote not found for update');
        }

        const updatedVote = await this.prisma.vote.update({
          where: { id: existingVote.id },
          data: {
            score: castVoteDto.score,
            comment: castVoteDto.comment || null,
          },
        });

        this.logger.log(
          `Vote updated by judge ${judgeAddress} for participant ${castVoteDto.participantId}`,
          {
            voteId: updatedVote.id,
            oldScore: existingVote.score,
            newScore: updatedVote.score,
            hasComment: !!updatedVote.comment,
          },
        );

        return {
          id: updatedVote.id,
          hackathonId: updatedVote.hackathonId,
          judgeAddress: updatedVote.judgeAddress,
          participantId: updatedVote.participantId,
          score: updatedVote.score,
          comment: updatedVote.comment,
          createdAt: updatedVote.createdAt,
          updatedAt: updatedVote.updatedAt,
        };
      } else {
        // Create new vote
        const vote = await this.prisma.vote.create({
          data: {
            hackathonId,
            judgeAddress,
            participantId: castVoteDto.participantId,
            score: castVoteDto.score,
            comment: castVoteDto.comment || null,
          },
        });

        this.logger.log(
          `New vote cast by judge ${judgeAddress} for participant ${castVoteDto.participantId}`,
          {
            voteId: vote.id,
            score: vote.score,
            hasComment: !!vote.comment,
          },
        );

        return {
          id: vote.id,
          hackathonId: vote.hackathonId,
          judgeAddress: vote.judgeAddress,
          participantId: vote.participantId,
          score: vote.score,
          comment: vote.comment,
          createdAt: vote.createdAt,
          updatedAt: vote.updatedAt,
        };
      }
    } catch (error) {
      this.logger.error(`Failed to ${isUpdate ? 'update' : 'create'} vote`, {
        error: error instanceof Error ? error.message : String(error),
        hackathonId,
        judgeAddress,
        participantId: castVoteDto.participantId,
      });

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      // Handle unexpected database errors
      throw new BadRequestException(
        'Failed to process vote. Please try again.',
      );
    }
  }

  async getVotingResults(
    hackathonId: string,
  ): Promise<HackathonVotingResultsDto> {
    const hackathon = await this.prisma.hackathon.findUnique({
      where: { id: hackathonId },
    });

    if (!hackathon) {
      throw new NotFoundException(`Hackathon with ID ${hackathonId} not found`);
    }

    const participants = await this.prisma.participant.findMany({
      where: { hackathonId },
      include: {
        votes: {
          include: {
            judge: {
              select: {
                walletAddress: true,
                username: true,
              },
            },
          },
        },
      },
    });

    const totalJudges = await this.prisma.hackathonJudge.count({
      where: { hackathonId },
    });

    // Transform data for ranking service
    const participantData = participants.map((participant) => ({
      id: participant.id,
      walletAddress: participant.walletAddress,
      submissionUrl: participant.submissionUrl,
      votes: participant.votes.map((vote) => ({
        id: vote.id,
        judgeAddress: vote.judgeAddress,
        participantId: vote.participantId,
        score: vote.score,
        comment: vote.comment,
        createdAt: vote.createdAt,
        updatedAt: vote.updatedAt,
      })),
    }));

    // Use advanced ranking algorithm
    const { rankings, metrics } = this.rankingService.calculateRankings(
      participantData,
      totalJudges,
      {
        useWeightedScoring: true,
        useNormalizedScoring: true,
        penalizeIncompleteVoting: true,
        minimumVotesThreshold: Math.max(1, Math.ceil(totalJudges * 0.3)), // At least 30% of judges
      },
    );

    // Transform rankings back to expected format
    const results = rankings.map((ranking) => ({
      participantId: ranking.participantId,
      walletAddress: ranking.walletAddress,
      submissionUrl: ranking.submissionUrl,
      totalVotes: ranking.totalVotes,
      averageScore: ranking.averageScore,
      weightedScore: ranking.weightedScore,
      normalizedScore: ranking.normalizedScore,
      rank: ranking.rank,
      rankTier: ranking.rankTier,
      scoreBreakdown: ranking.scoreBreakdown,
      votes: ranking.votes.map((vote) => ({
        id: vote.id,
        hackathonId: hackathonId,
        judgeAddress: vote.judgeAddress,
        participantId: vote.participantId,
        score: vote.score,
        comment: vote.comment,
        createdAt: vote.createdAt,
        updatedAt: vote.updatedAt,
      })),
    }));

    this.logger.log(
      `Generated advanced rankings for hackathon ${hackathonId}: ${rankings.length} participants ranked`,
    );

    return {
      hackathonId,
      participants: results,
      totalJudges,
      totalParticipants: participants.length,
      rankingMetrics: {
        totalParticipants: metrics.totalParticipants,
        totalJudges: metrics.totalJudges,
        averageParticipation: metrics.averageParticipation,
        scoreDistribution: metrics.scoreDistribution,
      },
    };
  }

  // Winner Determination Methods

  async calculateWinners(
    hackathonId: string,
  ): Promise<WinnerDeterminationResult> {
    const hackathon = await this.prisma.hackathon.findUnique({
      where: { id: hackathonId },
    });

    if (!hackathon) {
      throw new NotFoundException(`Hackathon with ID ${hackathonId} not found`);
    }

    // Only allow winner calculation for completed hackathons
    if (hackathon.status !== HackathonStatus.COMPLETED) {
      throw new BadRequestException(
        'Winners can only be calculated for completed hackathons',
      );
    }

    return await this.winnerDeterminationService.calculateWinners(hackathonId);
  }

  async finalizeWinners(
    hackathonId: string,
    organizerAddress: string,
  ): Promise<WinnerDeterminationResult> {
    const hackathon = await this.prisma.hackathon.findUnique({
      where: { id: hackathonId },
    });

    if (!hackathon) {
      throw new NotFoundException(`Hackathon with ID ${hackathonId} not found`);
    }

    // Only organizer can finalize winners
    if (hackathon.organizerAddress !== organizerAddress) {
      throw new ForbiddenException(
        'Only the hackathon organizer can finalize winners',
      );
    }

    // Only allow winner finalization for completed hackathons
    if (hackathon.status !== HackathonStatus.COMPLETED) {
      throw new BadRequestException(
        'Winners can only be finalized for completed hackathons',
      );
    }

    // Check if winners are already finalized
    const alreadyFinalized =
      await this.winnerDeterminationService.areWinnersFinalized(hackathonId);
    if (alreadyFinalized) {
      throw new ConflictException(
        'Winners have already been finalized for this hackathon',
      );
    }

    const result =
      await this.winnerDeterminationService.finalizeWinners(hackathonId);

    this.logger.log(
      `Winners finalized for hackathon ${hackathonId} by ${organizerAddress}`,
    );

    return result;
  }

  async getWinners(
    hackathonId: string,
  ): Promise<WinnerDeterminationResult | null> {
    const hackathon = await this.prisma.hackathon.findUnique({
      where: { id: hackathonId },
    });

    if (!hackathon) {
      throw new NotFoundException(`Hackathon with ID ${hackathonId} not found`);
    }

    return await this.winnerDeterminationService.getWinners(hackathonId);
  }

  async getTop3Winners(hackathonId: string): Promise<{
    firstPlace?: string;
    secondPlace?: string;
    thirdPlace?: string;
  }> {
    const hackathon = await this.prisma.hackathon.findUnique({
      where: { id: hackathonId },
    });

    if (!hackathon) {
      throw new NotFoundException(`Hackathon with ID ${hackathonId} not found`);
    }

    return await this.winnerDeterminationService.getTop3Winners(hackathonId);
  }

  async areWinnersFinalized(hackathonId: string): Promise<boolean> {
    const hackathon = await this.prisma.hackathon.findUnique({
      where: { id: hackathonId },
    });

    if (!hackathon) {
      throw new NotFoundException(`Hackathon with ID ${hackathonId} not found`);
    }

    return await this.winnerDeterminationService.areWinnersFinalized(
      hackathonId,
    );
  }

  /**
   * Get database provider from environment variables
   */
  private getDatabaseProvider(): 'postgresql' | 'sqlite' | 'mysql' {
    return this.configService.get<'postgresql' | 'sqlite' | 'mysql'>(
      'DATABASE_PROVIDER',
      'sqlite',
    );
  }

  /**
   * Create search options for database provider
   */
  private getSearchOptions(
    searchTerm: string,
    dbProvider: 'postgresql' | 'sqlite' | 'mysql',
  ) {
    switch (dbProvider) {
      case 'postgresql':
      case 'mysql':
        return { contains: searchTerm, mode: 'insensitive' as const };
      case 'sqlite':
      default:
        return { contains: searchTerm.toLowerCase() };
    }
  }

  private mapToResponseDto(
    hackathon: any,
    includeParticipants = false,
  ): HackathonResponseDto {
    const response: HackathonResponseDto = {
      id: hackathon.id,
      title: hackathon.title,
      description: hackathon.description,
      deadline: hackathon.submissionDeadline.toISOString(), // Fix: use submissionDeadline
      status: hackathon.status,
      lotteryPercentage: 0, // Fix: Set default value or remove from schema
      contractAddress: hackathon.contractAddress,
      creatorAddress: hackathon.organizerAddress, // Fix: use organizerAddress
      participantCount: hackathon._count?.participants || 0,
      createdAt: hackathon.createdAt.toISOString(),
      updatedAt: hackathon.updatedAt.toISOString(),
    };

    if (includeParticipants && hackathon.participants) {
      response.participants = hackathon.participants.map((p: any) => ({
        id: p.id,
        walletAddress: p.walletAddress,
        submissionUrl: p.submissionUrl ?? undefined,
        entryFee: p.entryFee ?? undefined,
        rank: p.rank ?? undefined,
        prizeAmount: p.prizeAmount ?? undefined,
        createdAt: p.createdAt.toISOString(),
      }));
    }

    return response;
  }

  // Judge Dashboard Methods

  /**
   * Get hackathons assigned to a specific judge
   */
  async getJudgeAssignedHackathons(
    judgeAddress: string,
  ): Promise<JudgeDashboardResponseDto> {
    this.logger.log(`Fetching assigned hackathons for judge ${judgeAddress}`);

    // Get all hackathons where this judge is assigned
    const judgeAssignments = await this.prisma.hackathonJudge.findMany({
      where: { judgeAddress },
      include: {
        hackathon: {
          include: {
            _count: {
              select: { participants: true },
            },
            participants: true,
          },
        },
      },
      orderBy: { hackathon: { votingDeadline: 'asc' } }, // Order by deadline
    });

    const assignedHackathons: JudgeHackathonAssignmentDto[] = [];
    let completedHackathons = 0;
    let pendingHackathons = 0;

    for (const assignment of judgeAssignments) {
      const hackathon = assignment.hackathon;

      // Calculate voting progress for this judge
      const votingProgress = await this.calculateJudgeVotingProgress(
        judgeAddress,
        hackathon.id,
      );

      // Calculate deadline priority
      const now = new Date();
      const deadline = new Date(hackathon.votingDeadline);
      const daysUntilDeadline = Math.ceil(
        (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      const isOverdue = now > deadline;

      let priority: 'high' | 'medium' | 'low';
      if (isOverdue || daysUntilDeadline <= 1) {
        priority = 'high';
      } else if (daysUntilDeadline <= 3) {
        priority = 'medium';
      } else {
        priority = 'low';
      }

      // Track completion status
      if (votingProgress.completionPercentage === 100) {
        completedHackathons++;
      } else {
        pendingHackathons++;
      }

      const hackathonAssignment: JudgeHackathonAssignmentDto = {
        hackathon: this.mapToResponseDto(hackathon),
        votingProgress,
        deadline: hackathon.votingDeadline.toISOString(),
        priority,
        daysUntilDeadline: Math.max(0, daysUntilDeadline),
        isOverdue,
      };

      assignedHackathons.push(hackathonAssignment);
    }

    this.logger.log(
      `Found ${assignedHackathons.length} assigned hackathons for judge ${judgeAddress}`,
    );

    return {
      assignedHackathons,
      totalAssigned: assignedHackathons.length,
      pendingHackathons,
      completedHackathons,
    };
  }

  /**
   * Calculate voting progress for a specific judge in a hackathon
   */
  public async calculateJudgeVotingProgress(
    judgeAddress: string,
    hackathonId: string,
  ): Promise<VotingProgressDto> {
    // Get total participants in the hackathon
    const totalParticipants = await this.prisma.participant.count({
      where: { hackathonId },
    });

    // Get votes cast by this judge in this hackathon
    const completedVotes = await this.prisma.vote.count({
      where: {
        hackathonId,
        judgeAddress,
      },
    });

    const pendingVotes = totalParticipants - completedVotes;
    const completionPercentage =
      totalParticipants > 0
        ? Math.round((completedVotes / totalParticipants) * 100)
        : 0;

    return {
      totalParticipants,
      completedVotes,
      pendingVotes,
      completionPercentage,
    };
  }

  /**
   * Get voting statistics for a specific judge
   */
  async getJudgeVotingStatistics(
    judgeAddress: string,
  ): Promise<JudgeVotingStatisticsDto> {
    this.logger.log(`Fetching voting statistics for judge ${judgeAddress}`);

    // Get all votes by this judge
    const votes = await this.prisma.vote.findMany({
      where: { judgeAddress },
      orderBy: { createdAt: 'desc' },
    });

    // Get unique hackathons judged
    const uniqueHackathonIds = new Set(votes.map((vote) => vote.hackathonId));
    const totalHackathonsJudged = uniqueHackathonIds.size;

    // Calculate statistics
    const totalVotesCast = votes.length;
    const votesWithComments = votes.filter((vote) => vote.comment).length;
    const commentPercentage =
      totalVotesCast > 0
        ? Math.round((votesWithComments / totalVotesCast) * 100)
        : 0;

    // Calculate average score
    const totalScore = votes.reduce((sum, vote) => sum + vote.score, 0);
    const averageScore =
      totalVotesCast > 0
        ? Math.round((totalScore / totalVotesCast) * 10) / 10
        : 0;

    // Calculate score distribution
    const scoreDistribution: Record<string, number> = {
      '1-2': 0,
      '3-4': 0,
      '5-6': 0,
      '7-8': 0,
      '9-10': 0,
    };

    votes.forEach((vote) => {
      if (vote.score >= 1 && vote.score <= 2) scoreDistribution['1-2']++;
      else if (vote.score >= 3 && vote.score <= 4) scoreDistribution['3-4']++;
      else if (vote.score >= 5 && vote.score <= 6) scoreDistribution['5-6']++;
      else if (vote.score >= 7 && vote.score <= 8) scoreDistribution['7-8']++;
      else if (vote.score >= 9 && vote.score <= 10) scoreDistribution['9-10']++;
    });

    // Get last voting activity
    const lastVotingActivity =
      votes.length > 0 ? votes[0].createdAt.toISOString() : '';

    this.logger.log(
      `Judge ${judgeAddress} statistics: ${totalVotesCast} votes across ${totalHackathonsJudged} hackathons`,
    );

    return {
      totalVotesCast,
      totalHackathonsJudged,
      averageScore,
      votesWithComments,
      commentPercentage,
      lastVotingActivity,
      scoreDistribution,
    };
  }

  /**
   * Get participants preview for a specific hackathon for a judge
   */
  async getHackathonParticipantsPreview(
    hackathonId: string,
    judgeAddress: string,
  ): Promise<HackathonParticipantsPreviewDto> {
    this.logger.log(
      `Fetching participants preview for hackathon ${hackathonId} and judge ${judgeAddress}`,
    );

    // Get all participants in the hackathon
    const participants = await this.prisma.participant.findMany({
      where: { hackathonId },
      orderBy: { createdAt: 'asc' },
    });

    // Get all votes by this judge for this hackathon
    const judgeVotes = await this.prisma.vote.findMany({
      where: {
        hackathonId,
        judgeAddress,
      },
    });

    // Create a map for quick lookup
    const voteMap = new Map(
      judgeVotes.map((vote) => [vote.participantId, vote]),
    );

    const participantsPreview: ParticipantPreviewDto[] = participants.map(
      (participant) => {
        const vote = voteMap.get(participant.id);
        return {
          id: participant.id,
          walletAddress: participant.walletAddress,
          submissionUrl: participant.submissionUrl || '',
          hasVoted: !!vote,
          currentScore: vote?.score || 0,
          currentComment: vote?.comment || '',
        };
      },
    );

    return {
      hackathonId,
      participants: participantsPreview,
      total: participants.length,
    };
  }
}

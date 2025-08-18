import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HackathonStatus, Prisma } from '@prisma/client';
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
} from './dto';

@Injectable()
export class HackathonService {
  private readonly logger = new Logger(HackathonService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
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

    // Validate status transitions
    if (
      updateHackathonDto.status &&
      existingHackathon.status !== updateHackathonDto.status
    ) {
      this.validateStatusTransition(
        existingHackathon.status,
        updateHackathonDto.status,
      );
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
    if (
      hackathon.status !== HackathonStatus.REGISTRATION_OPEN
    ) {
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
      [HackathonStatus.DRAFT]: [
        HackathonStatus.REGISTRATION_OPEN,
      ],
      [HackathonStatus.REGISTRATION_OPEN]: [
        HackathonStatus.REGISTRATION_CLOSED,
        HackathonStatus.SUBMISSION_OPEN,
      ],
      [HackathonStatus.REGISTRATION_CLOSED]: [
        HackathonStatus.SUBMISSION_OPEN,
      ],
      [HackathonStatus.SUBMISSION_OPEN]: [
        HackathonStatus.SUBMISSION_CLOSED,
      ],
      [HackathonStatus.SUBMISSION_CLOSED]: [
        HackathonStatus.VOTING_OPEN,
      ],
      [HackathonStatus.VOTING_OPEN]: [
        HackathonStatus.VOTING_CLOSED,
      ],
      [HackathonStatus.VOTING_CLOSED]: [
        HackathonStatus.COMPLETED,
      ],
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
      throw new ForbiddenException('Only the hackathon organizer can add judges');
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
      throw new BadRequestException('Organizer cannot be a judge of their own hackathon');
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
      throw new ForbiddenException('Only the hackathon organizer can remove judges');
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
    const hackathon = await this.prisma.hackathon.findUnique({
      where: { id: hackathonId },
    });

    if (!hackathon) {
      throw new NotFoundException(`Hackathon with ID ${hackathonId} not found`);
    }

    // Check if hackathon is in voting phase
    if (hackathon.status !== HackathonStatus.VOTING_OPEN) {
      throw new BadRequestException('Hackathon is not in voting phase');
    }

    // Check if voting deadline has passed
    if (new Date() > hackathon.votingDeadline) {
      throw new BadRequestException('Voting deadline has passed');
    }

    // Check if user is a judge
    const judge = await this.prisma.hackathonJudge.findUnique({
      where: {
        hackathonId_judgeAddress: {
          hackathonId,
          judgeAddress,
        },
      },
    });

    if (!judge) {
      throw new ForbiddenException('Only authorized judges can vote');
    }

    // Check if participant exists
    const participant = await this.prisma.participant.findUnique({
      where: { id: castVoteDto.participantId },
    });

    if (!participant || participant.hackathonId !== hackathonId) {
      throw new NotFoundException('Participant not found in this hackathon');
    }

    // Check if judge has already voted for this participant
    const existingVote = await this.prisma.vote.findUnique({
      where: {
        hackathonId_judgeAddress_participantId: {
          hackathonId,
          judgeAddress,
          participantId: castVoteDto.participantId,
        },
      },
    });

    if (existingVote) {
      // Update existing vote
      const updatedVote = await this.prisma.vote.update({
        where: { id: existingVote.id },
        data: {
          score: castVoteDto.score,
          comment: castVoteDto.comment,
        },
      });

      this.logger.log(
        `Vote updated by judge ${judgeAddress} for participant ${castVoteDto.participantId}`,
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
          comment: castVoteDto.comment,
        },
      });

      this.logger.log(
        `Vote cast by judge ${judgeAddress} for participant ${castVoteDto.participantId}`,
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
  }

  async getVotingResults(hackathonId: string): Promise<HackathonVotingResultsDto> {
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

    const judges = await this.prisma.hackathonJudge.count({
      where: { hackathonId },
    });

    const results = participants.map((participant) => ({
      participantId: participant.id,
      walletAddress: participant.walletAddress,
      submissionUrl: participant.submissionUrl,
      totalVotes: participant.votes.length,
      averageScore:
        participant.votes.length > 0
          ? participant.votes.reduce((sum, vote) => sum + vote.score, 0) /
            participant.votes.length
          : 0,
      votes: participant.votes.map((vote) => ({
        id: vote.id,
        hackathonId: vote.hackathonId,
        judgeAddress: vote.judgeAddress,
        participantId: vote.participantId,
        score: vote.score,
        comment: vote.comment,
        createdAt: vote.createdAt,
        updatedAt: vote.updatedAt,
      })),
    }));

    // Sort by average score (descending)
    results.sort((a, b) => b.averageScore - a.averageScore);

    return {
      hackathonId,
      participants: results,
      totalJudges: judges,
      totalParticipants: participants.length,
    };
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
      deadline: hackathon.deadline.toISOString(),
      status: hackathon.status,
      lotteryPercentage: hackathon.lotteryPercentage,
      contractAddress: hackathon.contractAddress,
      creatorAddress: hackathon.creatorAddress,
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
}

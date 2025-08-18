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

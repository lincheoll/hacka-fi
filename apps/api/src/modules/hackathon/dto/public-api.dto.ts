import {
  IsOptional,
  IsNumber,
  IsString,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PublicFilterBy {
  PRIZE_AMOUNT = 'prizeAmount',
  PARTICIPANT_COUNT = 'participantCount',
  DATE_CREATED = 'dateCreated',
}

export enum PublicSortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class PublicHackathonQueryDto {
  @ApiPropertyOptional({ description: 'Page number', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    minimum: 1,
    maximum: 50,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Filter by specific field',
    enum: PublicFilterBy,
  })
  @IsOptional()
  @IsEnum(PublicFilterBy)
  filterBy?: PublicFilterBy;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: PublicSortOrder,
    default: PublicSortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(PublicSortOrder)
  sortOrder?: PublicSortOrder = PublicSortOrder.DESC;

  @ApiPropertyOptional({ description: 'Search term for title or description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Minimum prize amount filter' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  minPrizeAmount?: number;

  @ApiPropertyOptional({ description: 'Maximum prize amount filter' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  maxPrizeAmount?: number;
}

export class PublicHackathonResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  prizeAmount!: string;

  @ApiProperty()
  participantCount!: number;

  @ApiProperty()
  votingDeadline!: Date;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ required: false })
  coverImageUrl?: string | null;

  @ApiProperty()
  organizerAddress!: string;

  @ApiProperty()
  winners!: PublicWinnerResponseDto[];
}

export class PublicWinnerResponseDto {
  @ApiProperty()
  rank!: number;

  @ApiProperty()
  walletAddress!: string;

  @ApiProperty({ required: false })
  username?: string | null;

  @ApiProperty()
  submissionUrl!: string;

  @ApiProperty()
  averageScore!: number;

  @ApiProperty()
  prizeAmount!: string;

  @ApiProperty({ required: false })
  avatarUrl?: string | null;
}

export class PublicPlatformStatsResponseDto {
  @ApiProperty()
  totalHackathons!: number;

  @ApiProperty()
  completedHackathons!: number;

  @ApiProperty()
  totalParticipants!: number;

  @ApiProperty()
  totalPrizeDistributed!: string;

  @ApiProperty()
  averagePrizeAmount!: string;

  @ApiProperty()
  topWinners!: PublicTopWinnerDto[];
}

export class PublicTopWinnerDto {
  @ApiProperty()
  walletAddress!: string;

  @ApiProperty({ required: false })
  username?: string | null;

  @ApiProperty({ required: false })
  avatarUrl?: string | null;

  @ApiProperty()
  totalWins!: number;

  @ApiProperty()
  totalEarnings!: string;

  @ApiProperty()
  winRate!: number;
}

export class PublicHallOfFameQueryDto {
  @ApiPropertyOptional({ description: 'Page number', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Items per page',
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: PublicSortOrder,
    default: PublicSortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(PublicSortOrder)
  sortOrder?: PublicSortOrder = PublicSortOrder.DESC;
}

export class PublicHallOfFameResponseDto {
  @ApiProperty()
  data!: PublicTopWinnerDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  totalPages!: number;
}

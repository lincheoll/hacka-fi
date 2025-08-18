import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  Max,
  IsOptional,
} from 'class-validator';

export class CastVoteDto {
  @ApiProperty({
    description: 'ID of the participant being voted for',
    example: 1,
  })
  @IsInt()
  participantId!: number;

  @ApiProperty({
    description: 'Score for the participant (1-10)',
    example: 8,
    minimum: 1,
    maximum: 10,
  })
  @IsInt()
  @Min(1)
  @Max(10)
  score!: number;

  @ApiPropertyOptional({
    description: 'Optional comment from the judge',
    example: 'Great implementation with innovative features',
  })
  @IsString()
  @IsOptional()
  comment?: string;
}

export class VoteResponseDto {
  @ApiProperty({
    description: 'Vote ID',
    example: 1,
  })
  id!: number;

  @ApiProperty({
    description: 'Hackathon ID',
    example: 'clh123abc456',
  })
  hackathonId!: string;

  @ApiProperty({
    description: 'Judge wallet address',
    example: '0x1234567890123456789012345678901234567890',
  })
  judgeAddress!: string;

  @ApiProperty({
    description: 'Participant ID',
    example: 1,
  })
  participantId!: number;

  @ApiProperty({
    description: 'Score given (1-10)',
    example: 8,
  })
  score!: number;

  @ApiPropertyOptional({
    description: 'Judge comment',
    example: 'Great implementation with innovative features',
  })
  comment?: string | null | undefined;

  @ApiProperty({
    description: 'When the vote was cast',
    example: '2024-01-01T00:00:00Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'When the vote was last updated',
    example: '2024-01-01T00:00:00Z',
  })
  updatedAt!: Date;
}

export class ParticipantVoteSummaryDto {
  @ApiProperty({
    description: 'Participant ID',
    example: 1,
  })
  participantId!: number;

  @ApiProperty({
    description: 'Participant wallet address',
    example: '0x9876543210987654321098765432109876543210',
  })
  walletAddress!: string;

  @ApiProperty({
    description: 'Submission URL',
    example: 'https://github.com/user/project',
  })
  submissionUrl?: string | null | undefined;

  @ApiProperty({
    description: 'Total number of votes received',
    example: 3,
  })
  totalVotes!: number;

  @ApiProperty({
    description: 'Average score',
    example: 7.5,
  })
  averageScore!: number;

  @ApiPropertyOptional({
    description: 'Weighted score considering voting participation',
    example: 7.2,
  })
  weightedScore?: number;

  @ApiPropertyOptional({
    description: 'Normalized score (0-10 scale)',
    example: 8.3,
  })
  normalizedScore?: number;

  @ApiPropertyOptional({
    description: 'Participant rank',
    example: 1,
  })
  rank?: number;

  @ApiPropertyOptional({
    description: 'Rank tier',
    example: 'winner',
    enum: ['winner', 'runner-up', 'participant'],
  })
  rankTier?: 'winner' | 'runner-up' | 'participant';

  @ApiPropertyOptional({
    description: 'Detailed score breakdown',
    example: {
      simple: 7.5,
      weighted: 7.2,
      normalized: 8.3,
      consensus: 7.8,
    },
  })
  scoreBreakdown?: {
    simple: number;
    weighted: number;
    normalized: number;
    consensus: number;
  };

  @ApiProperty({
    description: 'Individual votes',
    type: [VoteResponseDto],
  })
  votes!: any[];
}

export class RankingMetricsDto {
  @ApiProperty({
    description: 'Total number of participants',
    example: 10,
  })
  totalParticipants!: number;

  @ApiProperty({
    description: 'Total number of judges',
    example: 5,
  })
  totalJudges!: number;

  @ApiProperty({
    description: 'Average votes per participant',
    example: 4.2,
  })
  averageParticipation!: number;

  @ApiProperty({
    description: 'Score distribution statistics',
    example: {
      min: 3.5,
      max: 9.2,
      mean: 6.8,
      median: 7.1,
      standardDeviation: 1.4,
    },
  })
  scoreDistribution!: {
    min: number;
    max: number;
    mean: number;
    median: number;
    standardDeviation: number;
  };
}

export class HackathonVotingResultsDto {
  @ApiProperty({
    description: 'Hackathon ID',
    example: 'clh123abc456',
  })
  hackathonId!: string;

  @ApiProperty({
    description: 'Voting results for all participants',
    type: [ParticipantVoteSummaryDto],
  })
  participants!: ParticipantVoteSummaryDto[];

  @ApiProperty({
    description: 'Total number of judges',
    example: 5,
  })
  totalJudges!: number;

  @ApiProperty({
    description: 'Total number of participants',
    example: 10,
  })
  totalParticipants!: number;

  @ApiPropertyOptional({
    description: 'Advanced ranking metrics',
    type: RankingMetricsDto,
  })
  rankingMetrics?: RankingMetricsDto;
}

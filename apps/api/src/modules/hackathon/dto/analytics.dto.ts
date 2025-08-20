import { IsOptional, IsDateString, IsEnum, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum AnalyticsDateRange {
  LAST_7_DAYS = 'last_7_days',
  LAST_30_DAYS = 'last_30_days',
  LAST_90_DAYS = 'last_90_days',
  LAST_YEAR = 'last_year',
  ALL_TIME = 'all_time',
  CUSTOM = 'custom',
}

export enum ExportFormat {
  CSV = 'csv',
  JSON = 'json',
}

export class AnalyticsQueryDto {
  @ApiPropertyOptional({
    enum: AnalyticsDateRange,
    default: AnalyticsDateRange.LAST_30_DAYS,
  })
  @IsOptional()
  @IsEnum(AnalyticsDateRange)
  dateRange?: AnalyticsDateRange = AnalyticsDateRange.LAST_30_DAYS;

  @ApiPropertyOptional({
    description: 'Start date for custom range (ISO string)',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'End date for custom range (ISO string)',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Filter by hackathon ID' })
  @IsOptional()
  @IsString()
  hackathonId?: string;
}

export class ExportQueryDto extends AnalyticsQueryDto {
  @ApiPropertyOptional({ enum: ExportFormat, default: ExportFormat.JSON })
  @IsOptional()
  @IsEnum(ExportFormat)
  format?: ExportFormat = ExportFormat.JSON;
}

export interface AnalyticsOverviewDto {
  totalHackathons: number;
  activeHackathons: number;
  completedHackathons: number;
  totalParticipants: number;
  totalJudges: number;
  totalPrizeDistributed: string;
  averageParticipantsPerHackathon: number;
  averageVotesPerHackathon: number;
  lastUpdated: Date;
}

export interface ParticipationTrendsDto {
  totalParticipations: number;
  registrationTrends: TrendDataPoint[];
  submissionTrends: TrendDataPoint[];
  completionRate: number;
  averageSubmissionTime: number; // in hours
}

export interface TrendDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface VotingStatisticsDto {
  totalVotes: number;
  averageScore: number;
  scoreDistribution: ScoreDistribution[];
  judgeParticipation: JudgeParticipation[];
  votingCompletion: number; // percentage
  averageVotingTime: number; // in hours
}

export interface ScoreDistribution {
  score: number;
  count: number;
  percentage: number;
}

export interface JudgeParticipation {
  judgeAddress: string;
  judgeName?: string;
  totalVotes: number;
  averageScore: number;
  hackathonsJudged: number;
  lastVoteDate: Date;
}

export interface PrizeDistributionAnalyticsDto {
  totalPrizePool: string;
  totalDistributed: string;
  distributionRate: number; // percentage
  winnersByCategory: WinnerCategory[];
  prizeUtilizationRate: number;
  averagePrizePerWinner: string;
  payoutEfficiency: number;
}

export interface WinnerCategory {
  rank: number;
  count: number;
  totalPrize: string;
  percentage: number;
}

export interface ComprehensiveAnalyticsDto {
  overview: AnalyticsOverviewDto;
  participation: ParticipationTrendsDto;
  voting: VotingStatisticsDto;
  prizeDistribution: PrizeDistributionAnalyticsDto;
  timeRange: {
    start: Date;
    end: Date;
    range: string;
  };
}

export interface ExportDataDto {
  participants?: ParticipantExportData[];
  votes?: VoteExportData[];
  hackathons?: HackathonExportData[];
  winners?: WinnerExportData[];
  metadata: {
    exportedAt: Date;
    format: ExportFormat;
    dateRange: string;
    totalRecords: number;
  };
}

export interface ParticipantExportData {
  hackathonId: string;
  hackathonTitle: string;
  walletAddress: string;
  username?: string;
  submissionUrl?: string;
  entryFee?: string;
  rank?: number;
  prizeAmount?: string;
  registeredAt: Date;
  submittedAt?: Date;
}

export interface VoteExportData {
  hackathonId: string;
  hackathonTitle: string;
  judgeAddress: string;
  judgeName?: string;
  participantAddress: string;
  participantName?: string;
  score: number;
  comment?: string;
  votedAt: Date;
}

export interface HackathonExportData {
  id: string;
  title: string;
  description: string;
  organizerAddress: string;
  status: string;
  prizeAmount?: string;
  participantCount: number;
  totalVotes: number;
  createdAt: Date;
  completedAt?: Date;
}

export interface WinnerExportData {
  hackathonId: string;
  hackathonTitle: string;
  rank: number;
  walletAddress: string;
  username?: string;
  submissionUrl: string;
  averageScore: number;
  prizeAmount: string;
  completedAt: Date;
}

import { ApiProperty } from '@nestjs/swagger';
import { HackathonResponseDto } from './hackathon-response.dto';

export class VotingProgressDto {
  @ApiProperty({
    description: 'Total number of participants in the hackathon',
    example: 10,
  })
  totalParticipants!: number;

  @ApiProperty({
    description: 'Number of participants this judge has voted for',
    example: 7,
  })
  completedVotes!: number;

  @ApiProperty({
    description: 'Number of participants this judge has not voted for yet',
    example: 3,
  })
  pendingVotes!: number;

  @ApiProperty({
    description: 'Voting completion percentage (0-100)',
    example: 70,
  })
  completionPercentage!: number;
}

export class JudgeHackathonAssignmentDto {
  @ApiProperty({
    description: 'Hackathon details',
    type: HackathonResponseDto,
  })
  hackathon!: HackathonResponseDto;

  @ApiProperty({
    description: 'Voting progress for this judge in this hackathon',
    type: VotingProgressDto,
  })
  votingProgress!: VotingProgressDto;

  @ApiProperty({
    description: 'Voting deadline for this hackathon',
    example: '2024-12-31T23:59:59Z',
  })
  deadline!: string;

  @ApiProperty({
    description: 'Priority level based on deadline proximity',
    enum: ['high', 'medium', 'low'],
    example: 'high',
  })
  priority!: 'high' | 'medium' | 'low';

  @ApiProperty({
    description: 'Days until voting deadline',
    example: 2,
  })
  daysUntilDeadline!: number;

  @ApiProperty({
    description: 'Whether this hackathon voting is overdue',
    example: false,
  })
  isOverdue!: boolean;
}

export class JudgeDashboardResponseDto {
  @ApiProperty({
    description: 'List of hackathons assigned to this judge',
    type: [JudgeHackathonAssignmentDto],
  })
  assignedHackathons!: JudgeHackathonAssignmentDto[];

  @ApiProperty({
    description: 'Total number of assigned hackathons',
    example: 5,
  })
  totalAssigned!: number;

  @ApiProperty({
    description: 'Number of hackathons with pending votes',
    example: 2,
  })
  pendingHackathons!: number;

  @ApiProperty({
    description: 'Number of hackathons with completed voting',
    example: 3,
  })
  completedHackathons!: number;
}

export class JudgeVotingStatisticsDto {
  @ApiProperty({
    description: 'Total number of votes cast by this judge',
    example: 45,
  })
  totalVotesCast!: number;

  @ApiProperty({
    description: 'Total number of hackathons judged',
    example: 8,
  })
  totalHackathonsJudged!: number;

  @ApiProperty({
    description: 'Average score given by this judge',
    example: 7.2,
  })
  averageScore!: number;

  @ApiProperty({
    description: 'Number of votes with comments',
    example: 35,
  })
  votesWithComments!: number;

  @ApiProperty({
    description: 'Percentage of votes that include comments',
    example: 77.8,
  })
  commentPercentage!: number;

  @ApiProperty({
    description: 'Most recent voting activity timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  lastVotingActivity?: string;

  @ApiProperty({
    description: 'Score distribution histogram',
    example: { '1-2': 2, '3-4': 5, '5-6': 8, '7-8': 15, '9-10': 15 },
  })
  scoreDistribution!: Record<string, number>;
}

export class ParticipantPreviewDto {
  @ApiProperty({
    description: 'Participant ID',
    example: 123,
  })
  id!: number;

  @ApiProperty({
    description: 'Participant wallet address',
    example: '0x1234567890123456789012345678901234567890',
  })
  walletAddress!: string;

  @ApiProperty({
    description: 'Submission URL',
    example: 'https://github.com/user/project',
  })
  submissionUrl?: string;

  @ApiProperty({
    description: 'Whether this judge has already voted for this participant',
    example: false,
  })
  hasVoted!: boolean;

  @ApiProperty({
    description: 'Current vote score if already voted',
    example: 8,
  })
  currentScore?: number;

  @ApiProperty({
    description: 'Current vote comment if already voted',
    example: 'Great project with innovative approach',
  })
  currentComment?: string;
}

export class HackathonParticipantsPreviewDto {
  @ApiProperty({
    description: 'Hackathon ID',
    example: 'clh123abc456',
  })
  hackathonId!: string;

  @ApiProperty({
    description: 'List of participants with preview information',
    type: [ParticipantPreviewDto],
  })
  participants!: ParticipantPreviewDto[];

  @ApiProperty({
    description: 'Total number of participants',
    example: 10,
  })
  total!: number;
}

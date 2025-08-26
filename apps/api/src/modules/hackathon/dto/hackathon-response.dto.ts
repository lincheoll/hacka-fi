import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HackathonStatus } from '@prisma/client';

export class ParticipantResponseDto {
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

  @ApiPropertyOptional({
    description: 'Submission URL',
    example: 'https://github.com/user/project',
  })
  submissionUrl?: string | undefined;

  @ApiPropertyOptional({
    description: 'Entry fee paid in wei',
    example: '1000000000000000000',
  })
  entryFee?: string | undefined;

  @ApiPropertyOptional({
    description: 'Final rank in hackathon',
    example: 1,
  })
  rank?: number | undefined;

  @ApiPropertyOptional({
    description: 'Prize amount won in wei',
    example: '5000000000000000000',
  })
  prizeAmount?: string | undefined;

  @ApiProperty({
    description: 'Participation date',
    example: '2024-08-16T12:00:00.000Z',
  })
  createdAt!: string;
}

export class HackathonResponseDto {
  @ApiProperty({
    description: 'Hackathon ID',
    example: 'clxxx...',
  })
  id!: string;

  @ApiProperty({
    description: 'Hackathon title',
    example: 'DeFi Innovation Challenge 2024',
  })
  title!: string;

  @ApiProperty({
    description: 'Hackathon description',
    example: 'Build innovative DeFi solutions on Kaia network...',
  })
  description!: string;

  @ApiProperty({
    description: 'Registration deadline',
    example: '2024-12-15T23:59:59.000Z',
  })
  registrationDeadline!: string;

  @ApiProperty({
    description: 'Submission deadline',
    example: '2024-12-31T23:59:59.000Z',
  })
  submissionDeadline!: string;

  @ApiProperty({
    description: 'Voting deadline',
    example: '2025-01-15T23:59:59.000Z',
  })
  votingDeadline!: string;

  @ApiProperty({
    description: 'Current status',
    enum: HackathonStatus,
    example: HackathonStatus.SUBMISSION_OPEN,
  })
  status!: HackathonStatus;

  @ApiPropertyOptional({
    description: 'Smart contract address',
    example: '0x1234567890123456789012345678901234567890',
  })
  contractAddress?: string | null = null;

  @ApiProperty({
    description: 'Organizer wallet address',
    example: '0x0987654321098765432109876543210987654321',
  })
  organizerAddress!: string;

  @ApiProperty({
    description: 'Number of participants',
    example: 25,
  })
  participantCount!: number;

  @ApiProperty({
    description: 'Creation date',
    example: '2024-08-01T10:00:00.000Z',
  })
  createdAt!: string;

  @ApiProperty({
    description: 'Last update date',
    example: '2024-08-16T12:00:00.000Z',
  })
  updatedAt!: string;

  @ApiPropertyOptional({
    description: 'List of participants (only included in detailed view)',
    type: [ParticipantResponseDto],
  })
  participants?: ParticipantResponseDto[];

  @ApiPropertyOptional({
    description: 'Fee information for this hackathon',
    type: () => HackathonFeeInfoDto,
  })
  feeInfo?: HackathonFeeInfoDto;
}

export class HackathonFeeInfoDto {
  @ApiProperty({
    description: 'Fee rate locked at creation (basis points)',
    example: 250,
  })
  lockedFeeRate!: number;

  @ApiProperty({
    description: 'Original prize pool amount before fees',
    example: '10000000000000000000',
  })
  totalPrizePool!: string;

  @ApiProperty({
    description: 'Platform fee amount',
    example: '250000000000000000',
  })
  platformFee!: string;

  @ApiProperty({
    description: 'Amount distributed to winners (after fee)',
    example: '9750000000000000000',
  })
  distributionAmount!: string;

  @ApiProperty({
    description: 'Formatted platform fee amount',
    example: '0.25',
  })
  platformFeeFormatted!: string;

  @ApiProperty({
    description: 'Formatted distribution amount',
    example: '9.75',
  })
  distributionAmountFormatted!: string;

  @ApiPropertyOptional({
    description: 'Token address for ERC20 prizes (null for native KAIA)',
    example: '0x1234567890123456789012345678901234567890',
  })
  tokenAddress?: string | null;
}

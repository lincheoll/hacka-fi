import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, IsOptional } from 'class-validator';
import { HackathonStatus } from '@prisma/client';

export class UpdateStatusDto {
  @ApiProperty({
    description: 'New status to set',
    enum: HackathonStatus,
    example: HackathonStatus.REGISTRATION_OPEN,
  })
  @IsEnum(HackathonStatus)
  status!: HackathonStatus;

  @ApiProperty({
    description: 'Reason for status change',
    example: 'Opening registration as planned',
  })
  @IsString()
  reason!: string;

  @ApiProperty({
    description: 'Additional metadata for the status change',
    example: { adminNotes: 'Manual override due to delay' },
    required: false,
  })
  @IsOptional()
  metadata?: Record<string, any>;
}

export class StatusSummaryResponseDto {
  @ApiProperty({
    description: 'Current hackathon status',
    enum: HackathonStatus,
    example: HackathonStatus.SUBMISSION_OPEN,
  })
  currentStatus!: HackathonStatus;

  @ApiProperty({
    description: 'Status counts by type',
    example: {
      DRAFT: 5,
      REGISTRATION_OPEN: 2,
      SUBMISSION_OPEN: 1,
      COMPLETED: 10
    },
  })
  statusCounts!: Record<string, number>;

  @ApiProperty({
    description: 'Number of hackathons with automatic status checking enabled',
    example: 3,
  })
  activeHackathonsCount!: number;

  @ApiProperty({
    description: 'Recent status changes',
    example: [
      {
        hackathonId: 'hack_123',
        fromStatus: 'REGISTRATION_OPEN',
        toStatus: 'REGISTRATION_CLOSED',
        reason: 'Registration deadline passed',
        timestamp: '2024-08-17T10:00:00Z'
      }
    ],
  })
  recentChanges!: Array<{
    hackathonId: string;
    fromStatus: HackathonStatus;
    toStatus: HackathonStatus;
    reason: string;
    timestamp: string;
  }>;
}
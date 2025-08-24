import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  Min,
  Max,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateHackathonDto {
  @ApiProperty({
    description: 'Hackathon title',
    example: 'DeFi Innovation Challenge 2024',
    minLength: 3,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(100)
  title!: string;

  @ApiProperty({
    description: 'Detailed description of the hackathon',
    example: 'Build innovative DeFi solutions on Kaia network...',
    minLength: 10,
    maxLength: 2000,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(2000)
  description!: string;

  @ApiProperty({
    description: 'Registration deadline in ISO 8601 format',
    example: '2024-12-15T23:59:59.000Z',
  })
  @IsDateString()
  registrationDeadline!: string;

  @ApiProperty({
    description: 'Submission deadline in ISO 8601 format',
    example: '2024-12-31T23:59:59.000Z',
  })
  @IsDateString()
  submissionDeadline!: string;

  @ApiProperty({
    description: 'Voting deadline in ISO 8601 format',
    example: '2025-01-07T23:59:59.000Z',
  })
  @IsDateString()
  votingDeadline!: string;

  @ApiProperty({
    description: 'Prize amount in KAIA',
    example: 1000,
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  prizeAmount?: number;

  @ApiProperty({
    description: 'Entry fee in KAIA',
    example: 10,
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  entryFee?: number;

  @ApiProperty({
    description: 'Maximum number of participants',
    example: 100,
    minimum: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxParticipants?: number;
}

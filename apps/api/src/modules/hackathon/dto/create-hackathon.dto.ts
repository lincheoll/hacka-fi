import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsInt,
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
    description: 'Submission deadline in ISO 8601 format',
    example: '2024-12-31T23:59:59.000Z',
  })
  @IsDateString()
  deadline!: string;

  @ApiProperty({
    description: 'Lottery percentage for prize distribution (0-100)',
    example: 20,
    minimum: 0,
    maximum: 100,
  })
  @IsInt()
  @Min(0)
  @Max(100)
  lotteryPercentage!: number;
}

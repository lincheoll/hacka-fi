import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class AddJudgeDto {
  @ApiProperty({
    description: 'Wallet address of the judge to add',
    example: '0x1234567890123456789012345678901234567890',
  })
  @IsString()
  @IsNotEmpty()
  judgeAddress!: string;

  @ApiPropertyOptional({
    description: 'Optional note about the judge',
    example: 'Expert in blockchain development',
  })
  @IsString()
  @IsOptional()
  note?: string;
}

export class RemoveJudgeDto {
  @ApiProperty({
    description: 'Wallet address of the judge to remove',
    example: '0x1234567890123456789012345678901234567890',
  })
  @IsString()
  @IsNotEmpty()
  judgeAddress!: string;
}

export class JudgeResponseDto {
  @ApiProperty({
    description: 'ID of the judge record',
    example: 1,
  })
  id!: number;

  @ApiProperty({
    description: 'Hackathon ID',
    example: 'clh123abc456',
  })
  hackathonId!: string;

  @ApiProperty({
    description: 'Wallet address of the judge',
    example: '0x1234567890123456789012345678901234567890',
  })
  judgeAddress!: string;

  @ApiProperty({
    description: 'Wallet address of who added this judge',
    example: '0x0987654321098765432109876543210987654321',
  })
  addedBy!: string;

  @ApiProperty({
    description: 'When the judge was added',
    example: '2024-01-01T00:00:00Z',
  })
  addedAt!: Date;

  @ApiPropertyOptional({
    description: 'Judge profile information',
  })
  judge?: {
    walletAddress: string;
    username?: string | null;
    bio?: string | null;
    avatarUrl?: string | null;
  };
}

export class JudgeListResponseDto {
  @ApiProperty({
    description: 'List of judges',
    type: [JudgeResponseDto],
  })
  judges!: JudgeResponseDto[];

  @ApiProperty({
    description: 'Total number of judges',
    example: 5,
  })
  count!: number;
}
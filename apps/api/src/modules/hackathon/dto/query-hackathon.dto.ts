import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min, Max } from 'class-validator';
import { HackathonStatus } from '@prisma/client';

export class QueryHackathonDto {
  @ApiPropertyOptional({
    description: 'Filter by hackathon status',
    enum: HackathonStatus,
    example: HackathonStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(HackathonStatus)
  status?: HackathonStatus;

  @ApiPropertyOptional({
    description: 'Filter by creator wallet address',
    example: '0x1234567890123456789012345678901234567890',
  })
  @IsOptional()
  @IsString()
  creator?: string;

  @ApiPropertyOptional({
    description: 'Search in title and description',
    example: 'DeFi',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: 'Page number (1-based)',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Sort field',
    enum: ['createdAt', 'deadline', 'title'],
    example: 'createdAt',
  })
  @IsOptional()
  @IsEnum(['createdAt', 'deadline', 'title'])
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: ['asc', 'desc'],
    example: 'desc',
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}

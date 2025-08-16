import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CreateHackathonDto } from './create-hackathon.dto';
import { HackathonStatus } from '@prisma/client';

export class UpdateHackathonDto extends PartialType(CreateHackathonDto) {
  @ApiPropertyOptional({
    description: 'Current status of the hackathon',
    enum: HackathonStatus,
    example: HackathonStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(HackathonStatus)
  status?: HackathonStatus;

  @ApiPropertyOptional({
    description: 'Smart contract address (set when hackathon is deployed)',
    example: '0x1234567890123456789012345678901234567890',
  })
  @IsOptional()
  @IsString()
  contractAddress?: string;
}

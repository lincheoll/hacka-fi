import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl } from 'class-validator';

export class ParticipateHackathonDto {
  @ApiPropertyOptional({
    description: 'Project submission URL (GitHub, demo link, etc.)',
    example: 'https://github.com/user/amazing-defi-project',
  })
  @IsOptional()
  @IsString()
  @IsUrl()
  submissionUrl?: string;

  @ApiPropertyOptional({
    description: 'Entry fee amount in wei (if hackathon requires entry fee)',
    example: '1000000000000000000',
  })
  @IsOptional()
  @IsString()
  entryFee?: string;
}

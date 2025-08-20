import {
  Controller,
  Get,
  Query,
  Param,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { PublicApiService } from './public-api.service';
import { Public } from '../auth/decorators/public.decorator';
import {
  PublicHackathonQueryDto,
  PublicHackathonResponseDto,
  PublicWinnerResponseDto,
  PublicPlatformStatsResponseDto,
  PublicHallOfFameQueryDto,
  PublicHallOfFameResponseDto,
} from './dto/public-api.dto';

@ApiTags('Public API')
@Controller('public')
@Public()
export class PublicApiController {
  constructor(private readonly publicApiService: PublicApiService) {}

  @Get('hackathons/completed')
  @ApiOperation({
    summary: 'Get completed hackathons',
    description:
      'Retrieve a paginated list of completed hackathons with winners information. No authentication required.',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved completed hackathons',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            data: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/PublicHackathonResponseDto',
              },
            },
            total: { type: 'number', example: 25 },
            page: { type: 'number', example: 1 },
            limit: { type: 'number', example: 10 },
            totalPages: { type: 'number', example: 3 },
          },
        },
      },
    },
  })
  async getCompletedHackathons(@Query() query: PublicHackathonQueryDto) {
    const result = await this.publicApiService.getCompletedHackathons(query);
    return { success: true, data: result };
  }

  @Get('hackathons/:id/winners')
  @ApiOperation({
    summary: 'Get winners for specific hackathon',
    description:
      'Retrieve all winners for a specific completed hackathon. No authentication required.',
  })
  @ApiParam({
    name: 'id',
    description: 'Hackathon ID',
    example: 'clh7x8k9w0001js08x1234567',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved hackathon winners',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/PublicWinnerResponseDto' },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Hackathon not found or has no winners',
  })
  async getHackathonWinners(@Param('id') hackathonId: string) {
    const winners =
      await this.publicApiService.getHackathonWinners(hackathonId);

    if (winners.length === 0) {
      throw new NotFoundException('No winners found for this hackathon');
    }

    return { success: true, data: winners };
  }

  @Get('statistics')
  @ApiOperation({
    summary: 'Get platform statistics',
    description:
      'Retrieve overall platform statistics including total hackathons, participants, and prize distribution. No authentication required.',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved platform statistics',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: { $ref: '#/components/schemas/PublicPlatformStatsResponseDto' },
      },
    },
  })
  async getPlatformStatistics() {
    const stats = await this.publicApiService.getPlatformStatistics();
    return { success: true, data: stats };
  }

  @Get('winners/hall-of-fame')
  @ApiOperation({
    summary: 'Get hall of fame winners',
    description:
      'Retrieve top performing winners across all hackathons ranked by total earnings. No authentication required.',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved hall of fame',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: { $ref: '#/components/schemas/PublicHallOfFameResponseDto' },
      },
    },
  })
  async getHallOfFame(@Query() query: PublicHallOfFameQueryDto) {
    const hallOfFame = await this.publicApiService.getHallOfFame(query);
    return { success: true, data: hallOfFame };
  }

  @Get('winners')
  @ApiOperation({
    summary: 'Get all winners (alias for hall-of-fame)',
    description:
      'Retrieve all winners across platforms. Alias endpoint for hall-of-fame. No authentication required.',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved all winners',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: { $ref: '#/components/schemas/PublicHallOfFameResponseDto' },
      },
    },
  })
  async getAllWinners(@Query() query: PublicHallOfFameQueryDto) {
    return this.getHallOfFame(query);
  }

  @Get('hackathons/archive')
  @ApiOperation({
    summary: 'Get hackathon archive (alias for completed)',
    description:
      'Browse historical hackathons archive. Alias endpoint for completed hackathons. No authentication required.',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved hackathon archive',
  })
  async getHackathonArchive(@Query() query: PublicHackathonQueryDto) {
    return this.getCompletedHackathons(query);
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { HackathonService } from './hackathon.service';
import {
  CreateHackathonDto,
  UpdateHackathonDto,
  QueryHackathonDto,
  ParticipateHackathonDto,
  HackathonResponseDto,
  ParticipantResponseDto,
} from './dto';

@ApiTags('Hackathons')
@Controller('hackathons')
@UseGuards(JwtAuthGuard)
export class HackathonController {
  constructor(private readonly hackathonService: HackathonService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new hackathon',
    description:
      'Create a new hackathon. Only authenticated users can create hackathons.',
  })
  @ApiResponse({
    status: 201,
    description: 'Hackathon created successfully',
    type: HackathonResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid data or deadline in the past',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  async create(
    @Body() createHackathonDto: CreateHackathonDto,
    @Request() req: any,
  ): Promise<HackathonResponseDto> {
    return this.hackathonService.createHackathon(
      createHackathonDto,
      req.user.walletAddress,
    );
  }

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Get all hackathons',
    description:
      'Retrieve a paginated list of hackathons with optional filtering and sorting.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    description: 'Filter by hackathon status',
  })
  @ApiQuery({
    name: 'creator',
    required: false,
    description: 'Filter by creator wallet address',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search in title and description',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 10)',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description: 'Sort field (default: createdAt)',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Sort order (default: desc)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of hackathons retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/HackathonResponseDto' },
        },
        total: { type: 'number', example: 50 },
        page: { type: 'number', example: 1 },
        limit: { type: 'number', example: 10 },
        totalPages: { type: 'number', example: 5 },
      },
    },
  })
  async findAll(@Query() query: QueryHackathonDto) {
    return this.hackathonService.findAll(query);
  }

  @Get(':id')
  @Public()
  @ApiOperation({
    summary: 'Get hackathon by ID',
    description:
      'Retrieve detailed information about a specific hackathon including participants.',
  })
  @ApiParam({
    name: 'id',
    description: 'Hackathon ID',
    type: 'number',
    example: 1,
  })
  @ApiQuery({
    name: 'includeParticipants',
    required: false,
    description: 'Include participant details (default: false)',
    type: 'boolean',
  })
  @ApiResponse({
    status: 200,
    description: 'Hackathon details retrieved successfully',
    type: HackathonResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Hackathon not found',
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('includeParticipants') includeParticipants?: string,
  ): Promise<HackathonResponseDto> {
    const includeParticipantsFlag = includeParticipants === 'true';
    return this.hackathonService.findOne(id, includeParticipantsFlag);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update hackathon',
    description:
      'Update hackathon details. Only the creator can update their hackathon.',
  })
  @ApiParam({
    name: 'id',
    description: 'Hackathon ID',
    type: 'number',
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Hackathon updated successfully',
    type: HackathonResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid data or status transition',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - only creator can update',
  })
  @ApiResponse({
    status: 404,
    description: 'Hackathon not found',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateHackathonDto: UpdateHackathonDto,
    @Request() req: any,
  ): Promise<HackathonResponseDto> {
    return this.hackathonService.updateHackathon(
      id,
      updateHackathonDto,
      req.user.walletAddress,
    );
  }

  @Delete(':id')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete hackathon',
    description:
      'Soft delete hackathon (marks as cancelled). Only the creator can delete their hackathon.',
  })
  @ApiParam({
    name: 'id',
    description: 'Hackathon ID',
    type: 'number',
    example: 1,
  })
  @ApiResponse({
    status: 204,
    description: 'Hackathon deleted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - cannot delete active or voting hackathon',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - only creator can delete',
  })
  @ApiResponse({
    status: 404,
    description: 'Hackathon not found',
  })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ): Promise<void> {
    return this.hackathonService.deleteHackathon(id, req.user.walletAddress);
  }

  @Post(':id/participate')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Participate in hackathon',
    description:
      'Register to participate in a hackathon. Participants can optionally provide submission URL and entry fee.',
  })
  @ApiParam({
    name: 'id',
    description: 'Hackathon ID',
    type: 'number',
    example: 1,
  })
  @ApiResponse({
    status: 201,
    description: 'Successfully registered for hackathon',
    type: ParticipantResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - hackathon not accepting participants or deadline passed',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - authentication required',
  })
  @ApiResponse({
    status: 404,
    description: 'Hackathon not found',
  })
  @ApiResponse({
    status: 409,
    description:
      'Conflict - already participating or creator cannot participate',
  })
  async participate(
    @Param('id', ParseIntPipe) id: number,
    @Body() participateDto: ParticipateHackathonDto,
    @Request() req: any,
  ): Promise<ParticipantResponseDto> {
    return this.hackathonService.participateInHackathon(
      id,
      req.user.walletAddress,
      participateDto,
    );
  }
}

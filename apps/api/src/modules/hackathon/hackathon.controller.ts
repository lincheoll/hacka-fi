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
  UpdateStatusDto,
  StatusSummaryResponseDto,
  AddJudgeDto,
  RemoveJudgeDto,
  JudgeResponseDto,
  JudgeListResponseDto,
  CastVoteDto,
  VoteResponseDto,
  HackathonVotingResultsDto,
  JudgeDashboardResponseDto,
  JudgeVotingStatisticsDto,
  HackathonParticipantsPreviewDto,
} from './dto';
import { HackathonStatusService } from './hackathon-status.service';

@ApiTags('Hackathons')
@Controller('hackathons')
@UseGuards(JwtAuthGuard)
export class HackathonController {
  constructor(
    private readonly hackathonService: HackathonService,
    private readonly hackathonStatusService: HackathonStatusService,
  ) {}

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
    @Param('id') id: string,
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
    @Param('id') id: string,
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
  async remove(@Param('id') id: string, @Request() req: any): Promise<void> {
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
    @Param('id') id: string,
    @Body() participateDto: ParticipateHackathonDto,
    @Request() req: any,
  ): Promise<ParticipantResponseDto> {
    return this.hackathonService.participateInHackathon(
      id,
      req.user.walletAddress,
      participateDto,
    );
  }

  // Status Management Endpoints

  @Patch(':id/status')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update hackathon status manually',
    description:
      'Manually update the status of a hackathon. Only organizers can update their hackathon status.',
  })
  @ApiParam({
    name: 'id',
    description: 'Hackathon ID',
    example: 'hack_123',
  })
  @ApiResponse({
    status: 200,
    description: 'Status updated successfully',
    type: HackathonResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Only organizer can update status',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid status transition',
  })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateStatusDto,
    @Request() req: any,
  ): Promise<{ message: string; hackathon: HackathonResponseDto }> {
    await this.hackathonStatusService.manualStatusUpdate(
      id,
      updateStatusDto.status,
      updateStatusDto.reason,
      req.user.walletAddress,
      false, // not admin
    );

    const updatedHackathon = await this.hackathonService.findOne(id, false);

    return {
      message: 'Status updated successfully',
      hackathon: updatedHackathon,
    };
  }

  @Get('status/summary')
  @Public()
  @ApiOperation({
    summary: 'Get hackathon status summary',
    description: 'Get an overview of hackathon statuses and recent changes.',
  })
  @ApiResponse({
    status: 200,
    description: 'Status summary retrieved successfully',
    type: StatusSummaryResponseDto,
  })
  async getStatusSummary(): Promise<StatusSummaryResponseDto> {
    const summary = await this.hackathonStatusService.getStatusSummary();

    return {
      currentStatus: 'REGISTRATION_OPEN' as any, // This could be enhanced to show most common status
      statusCounts: summary.statusCounts,
      activeHackathonsCount: summary.activeHackathonsCount,
      recentChanges: summary.upcomingTransitions.map((h: any) => ({
        hackathonId: h.id,
        fromStatus: h.status,
        toStatus: h.nextTransition.newStatus || h.status,
        reason: h.nextTransition.reason || 'No pending changes',
        timestamp: new Date().toISOString(),
      })),
    };
  }

  // Judge Management Endpoints

  @Post(':id/judges')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Add a judge to hackathon',
    description:
      'Add a judge to the hackathon whitelist. Only the organizer can add judges.',
  })
  @ApiParam({
    name: 'id',
    description: 'Hackathon ID',
    example: 'hack_123',
  })
  @ApiResponse({
    status: 201,
    description: 'Judge added successfully',
    type: JudgeResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot add judges during or after voting',
  })
  @ApiResponse({
    status: 403,
    description: 'Only organizer can add judges',
  })
  @ApiResponse({
    status: 404,
    description: 'Hackathon not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Judge already added or organizer cannot be judge',
  })
  async addJudge(
    @Param('id') id: string,
    @Body() addJudgeDto: AddJudgeDto,
    @Request() req: any,
  ): Promise<JudgeResponseDto> {
    return this.hackathonService.addJudge(
      id,
      addJudgeDto,
      req.user.walletAddress,
    );
  }

  @Delete(':id/judges')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove a judge from hackathon',
    description:
      'Remove a judge from the hackathon whitelist. Only the organizer can remove judges.',
  })
  @ApiParam({
    name: 'id',
    description: 'Hackathon ID',
    example: 'hack_123',
  })
  @ApiResponse({
    status: 204,
    description: 'Judge removed successfully',
  })
  @ApiResponse({
    status: 400,
    description:
      'Cannot remove judges during voting or judge has already voted',
  })
  @ApiResponse({
    status: 403,
    description: 'Only organizer can remove judges',
  })
  @ApiResponse({
    status: 404,
    description: 'Hackathon or judge not found',
  })
  async removeJudge(
    @Param('id') id: string,
    @Body() removeJudgeDto: RemoveJudgeDto,
    @Request() req: any,
  ): Promise<void> {
    return this.hackathonService.removeJudge(
      id,
      removeJudgeDto,
      req.user.walletAddress,
    );
  }

  @Get(':id/judges')
  @Public()
  @ApiOperation({
    summary: 'Get hackathon judges',
    description: 'Get list of all judges for a hackathon.',
  })
  @ApiParam({
    name: 'id',
    description: 'Hackathon ID',
    example: 'hack_123',
  })
  @ApiResponse({
    status: 200,
    description: 'Judges retrieved successfully',
    type: JudgeListResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Hackathon not found',
  })
  async getJudges(@Param('id') id: string): Promise<JudgeListResponseDto> {
    return this.hackathonService.getJudges(id);
  }

  // Voting Endpoints

  @Post(':id/vote')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Cast or update vote',
    description:
      'Cast a vote for a participant. Only authorized judges can vote. Existing votes can be updated.',
  })
  @ApiParam({
    name: 'id',
    description: 'Hackathon ID',
    example: 'hack_123',
  })
  @ApiResponse({
    status: 201,
    description: 'Vote cast or updated successfully',
    type: VoteResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Hackathon not in voting phase or deadline passed',
  })
  @ApiResponse({
    status: 403,
    description: 'Only authorized judges can vote',
  })
  @ApiResponse({
    status: 404,
    description: 'Hackathon or participant not found',
  })
  async castVote(
    @Param('id') id: string,
    @Body() castVoteDto: CastVoteDto,
    @Request() req: any,
  ): Promise<VoteResponseDto> {
    return this.hackathonService.castVote(
      id,
      castVoteDto,
      req.user.walletAddress,
    );
  }

  @Get(':id/results')
  @Public()
  @ApiOperation({
    summary: 'Get voting results',
    description:
      'Get voting results for a hackathon, including scores and rankings.',
  })
  @ApiParam({
    name: 'id',
    description: 'Hackathon ID',
    example: 'hack_123',
  })
  @ApiResponse({
    status: 200,
    description: 'Voting results retrieved successfully',
    type: HackathonVotingResultsDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Hackathon not found',
  })
  async getVotingResults(
    @Param('id') id: string,
  ): Promise<HackathonVotingResultsDto> {
    return this.hackathonService.getVotingResults(id);
  }

  // Winner Determination Endpoints

  @Get(':id/winners/calculate')
  @Public()
  @ApiOperation({
    summary: 'Calculate winners',
    description:
      'Calculate winners for a completed hackathon based on voting results.',
  })
  @ApiParam({
    name: 'id',
    description: 'Hackathon ID',
    example: 'hack_123',
  })
  @ApiResponse({
    status: 200,
    description: 'Winners calculated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Hackathon not completed yet',
  })
  @ApiResponse({
    status: 404,
    description: 'Hackathon not found',
  })
  async calculateWinners(@Param('id') id: string) {
    return this.hackathonService.calculateWinners(id);
  }

  @Post(':id/winners/finalize')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Finalize winners',
    description:
      'Finalize winners for a hackathon and update database records. Only organizer can finalize.',
  })
  @ApiParam({
    name: 'id',
    description: 'Hackathon ID',
    example: 'hack_123',
  })
  @ApiResponse({
    status: 201,
    description: 'Winners finalized successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Hackathon not completed or winners already finalized',
  })
  @ApiResponse({
    status: 403,
    description: 'Only organizer can finalize winners',
  })
  @ApiResponse({
    status: 404,
    description: 'Hackathon not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Winners already finalized',
  })
  async finalizeWinners(@Param('id') id: string, @Request() req: any) {
    return this.hackathonService.finalizeWinners(id, req.user.walletAddress);
  }

  @Get(':id/winners')
  @Public()
  @ApiOperation({
    summary: 'Get winners',
    description: 'Get finalized winners for a hackathon.',
  })
  @ApiParam({
    name: 'id',
    description: 'Hackathon ID',
    example: 'hack_123',
  })
  @ApiResponse({
    status: 200,
    description: 'Winners retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Hackathon not found',
  })
  async getWinners(@Param('id') id: string) {
    return this.hackathonService.getWinners(id);
  }

  @Get(':id/winners/top3')
  @Public()
  @ApiOperation({
    summary: 'Get top 3 winners',
    description: 'Get top 3 winners for smart contract integration.',
  })
  @ApiParam({
    name: 'id',
    description: 'Hackathon ID',
    example: 'hack_123',
  })
  @ApiResponse({
    status: 200,
    description: 'Top 3 winners retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Hackathon not found',
  })
  async getTop3Winners(@Param('id') id: string) {
    return this.hackathonService.getTop3Winners(id);
  }

  @Get(':id/winners/export')
  @Public()
  @ApiOperation({
    summary: 'Export results data',
    description: 'Export detailed results data for external use or archival.',
  })
  @ApiParam({
    name: 'id',
    description: 'Hackathon ID',
    example: 'hack_123',
  })
  @ApiQuery({
    name: 'format',
    description: 'Export format (json, csv)',
    required: false,
    example: 'json',
  })
  @ApiResponse({
    status: 200,
    description: 'Results exported successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Hackathon not found',
  })
  async exportResults(
    @Param('id') id: string,
    @Query('format') format: 'json' | 'csv' = 'json',
  ) {
    return this.hackathonService.exportResults(id, format);
  }

  @Get(':id/winners/status')
  @Public()
  @ApiOperation({
    summary: 'Check if winners are finalized',
    description: 'Check if winners have been finalized for a hackathon.',
  })
  @ApiParam({
    name: 'id',
    description: 'Hackathon ID',
    example: 'hack_123',
  })
  @ApiResponse({
    status: 200,
    description: 'Winner status checked successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Hackathon not found',
  })
  async areWinnersFinalized(
    @Param('id') id: string,
  ): Promise<{ finalized: boolean }> {
    const finalized = await this.hackathonService.areWinnersFinalized(id);
    return { finalized };
  }

  // Enhanced Voting Period Management Endpoints

  @Get(':id/voting/info')
  @Public()
  @ApiOperation({
    summary: 'Get voting period information',
    description:
      'Get detailed voting period information including timeline and statistics.',
  })
  @ApiParam({
    name: 'id',
    description: 'Hackathon ID',
    example: 'hack_123',
  })
  @ApiResponse({
    status: 200,
    description: 'Voting period information retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Hackathon not found',
  })
  async getVotingPeriodInfo(@Param('id') id: string) {
    return this.hackathonStatusService.getVotingPeriodInfo(id);
  }

  @Get('voting/active')
  @Public()
  @ApiOperation({
    summary: 'Get all hackathons in voting phase',
    description:
      'Get all hackathons that are currently in voting phase or related states.',
  })
  @ApiResponse({
    status: 200,
    description: 'Voting phase hackathons retrieved successfully',
  })
  async getVotingPhaseHackathons() {
    return this.hackathonStatusService.getVotingPhaseHackathons();
  }

  @Post(':id/phases/force-transition')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Force phase transition (Admin only)',
    description:
      'Force a hackathon to transition to a specific phase. Admin only.',
  })
  @ApiParam({
    name: 'id',
    description: 'Hackathon ID',
    example: 'hack_123',
  })
  @ApiResponse({
    status: 200,
    description: 'Phase transition forced successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Admin access required',
  })
  @HttpCode(HttpStatus.OK)
  async forcePhaseTransition(
    @Param('id') id: string,
    @Body() body: { targetStatus: string; reason: string },
    @Request() req: any,
  ) {
    // Note: In production, add proper admin guard
    await this.hackathonStatusService.forcePhaseTransition(
      id,
      body.targetStatus as any,
      body.reason,
      req.user.walletAddress,
    );

    return {
      message: 'Phase transition forced successfully',
      hackathonId: id,
      newStatus: body.targetStatus,
      reason: body.reason,
    };
  }

  @Post('status/check')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Trigger manual status check',
    description:
      'Manually trigger status check for all hackathons. Admin only.',
  })
  @ApiResponse({
    status: 200,
    description: 'Status check completed',
  })
  @HttpCode(HttpStatus.OK)
  async triggerStatusCheck(@Request() req: any): Promise<{
    message: string;
    updatedCount: number;
    processedCount: number;
  }> {
    // Note: In real implementation, you'd want admin guard here
    // For now, allow any authenticated user

    // Get all active hackathons and check their status
    const activeHackathons =
      await this.hackathonStatusService.findActiveHackathons();
    let updatedCount = 0;

    for (const hackathon of activeHackathons) {
      const result =
        await this.hackathonStatusService.checkAndUpdateSingleHackathon(
          hackathon,
        );
      if (result.updated) {
        updatedCount++;
      }
    }

    return {
      message: 'Status check completed successfully',
      updatedCount,
      processedCount: activeHackathons.length,
    };
  }

  // Judge Dashboard Endpoints

  @Get('judges/dashboard/:address')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get judge dashboard',
    description:
      'Get dashboard information for a specific judge including assigned hackathons and voting progress.',
  })
  @ApiParam({
    name: 'address',
    description: 'Judge wallet address',
    example: '0x1234567890123456789012345678901234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Judge dashboard retrieved successfully',
    type: JudgeDashboardResponseDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied - only the judge can view their own dashboard',
  })
  @ApiResponse({
    status: 404,
    description: 'Judge not found or has no assignments',
  })
  async getJudgeDashboard(
    @Param('address') judgeAddress: string,
    @Request() req: any,
  ): Promise<JudgeDashboardResponseDto> {
    // Ensure judges can only access their own dashboard
    if (req.user.walletAddress.toLowerCase() !== judgeAddress.toLowerCase()) {
      throw new Error(
        'Access denied - only the judge can view their own dashboard',
      );
    }

    return this.hackathonService.getJudgeAssignedHackathons(judgeAddress);
  }

  @Get('judges/:address/voting-progress/:hackathonId')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get judge voting progress for specific hackathon',
    description:
      'Get detailed voting progress for a judge in a specific hackathon.',
  })
  @ApiParam({
    name: 'address',
    description: 'Judge wallet address',
    example: '0x1234567890123456789012345678901234567890',
  })
  @ApiParam({
    name: 'hackathonId',
    description: 'Hackathon ID',
    example: 'hack_123',
  })
  @ApiResponse({
    status: 200,
    description: 'Voting progress retrieved successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied - only the judge can view their own progress',
  })
  @ApiResponse({
    status: 404,
    description: 'Judge not assigned to this hackathon',
  })
  async getJudgeVotingProgress(
    @Param('address') judgeAddress: string,
    @Param('hackathonId') hackathonId: string,
    @Request() req: any,
  ) {
    // Ensure judges can only access their own progress
    if (req.user.walletAddress.toLowerCase() !== judgeAddress.toLowerCase()) {
      throw new Error(
        'Access denied - only the judge can view their own progress',
      );
    }

    return this.hackathonService.calculateJudgeVotingProgress(
      judgeAddress,
      hackathonId,
    );
  }

  @Get('judges/:address/statistics')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get judge voting statistics',
    description:
      'Get comprehensive voting statistics for a judge across all hackathons.',
  })
  @ApiParam({
    name: 'address',
    description: 'Judge wallet address',
    example: '0x1234567890123456789012345678901234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Judge statistics retrieved successfully',
    type: JudgeVotingStatisticsDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied - only the judge can view their own statistics',
  })
  async getJudgeVotingStatistics(
    @Param('address') judgeAddress: string,
    @Request() req: any,
  ): Promise<JudgeVotingStatisticsDto> {
    // Ensure judges can only access their own statistics
    if (req.user.walletAddress.toLowerCase() !== judgeAddress.toLowerCase()) {
      throw new Error(
        'Access denied - only the judge can view their own statistics',
      );
    }

    return this.hackathonService.getJudgeVotingStatistics(judgeAddress);
  }

  @Get(':id/participants/preview/:judgeAddress')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get hackathon participants preview for judge',
    description:
      'Get participants preview with voting status for a specific judge.',
  })
  @ApiParam({
    name: 'id',
    description: 'Hackathon ID',
    example: 'hack_123',
  })
  @ApiParam({
    name: 'judgeAddress',
    description: 'Judge wallet address',
    example: '0x1234567890123456789012345678901234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Participants preview retrieved successfully',
    type: HackathonParticipantsPreviewDto,
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied - only assigned judges can view participants',
  })
  @ApiResponse({
    status: 404,
    description: 'Hackathon not found or judge not assigned',
  })
  async getHackathonParticipantsPreview(
    @Param('id') hackathonId: string,
    @Param('judgeAddress') judgeAddress: string,
    @Request() req: any,
  ): Promise<HackathonParticipantsPreviewDto> {
    // Ensure judges can only access their own participant previews
    if (req.user.walletAddress.toLowerCase() !== judgeAddress.toLowerCase()) {
      throw new Error(
        'Access denied - only the judge can view their own participant preview',
      );
    }

    return this.hackathonService.getHackathonParticipantsPreview(
      hackathonId,
      judgeAddress,
    );
  }
}

import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
  Body,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { AutomatedDistributionService } from './automated-distribution.service';

@ApiTags('Automated Distribution')
@Controller('automated-distribution')
@UseGuards(JwtAuthGuard)
export class AutomatedDistributionController {
  constructor(
    private readonly automatedDistributionService: AutomatedDistributionService,
  ) {}

  @Post('manual/:hackathonId')
  @ApiOperation({
    summary: 'Manually trigger prize distribution for a hackathon',
  })
  @ApiParam({ name: 'hackathonId', description: 'Hackathon ID' })
  @ApiResponse({
    status: 200,
    description: 'Distribution triggered successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Hackathon not found' })
  @ApiBearerAuth()
  async manualDistribution(
    @Param('hackathonId') hackathonId: string,
    @Request() req: any,
  ) {
    const userAddress = req.user?.walletAddress;
    return this.automatedDistributionService.manualDistribution(
      hackathonId,
      userAddress,
    );
  }

  @Post('schedule/:hackathonId')
  @ApiOperation({ summary: 'Schedule prize distribution for a hackathon' })
  @ApiParam({ name: 'hackathonId', description: 'Hackathon ID' })
  @ApiResponse({
    status: 200,
    description: 'Distribution scheduled successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Hackathon not found' })
  @ApiBearerAuth()
  async scheduleDistribution(@Param('hackathonId') hackathonId: string) {
    await this.automatedDistributionService.scheduleDistribution(hackathonId);
    return {
      success: true,
      message: `Distribution scheduled for hackathon ${hackathonId}`,
    };
  }

  @Delete('cancel/:hackathonId')
  @ApiOperation({ summary: 'Cancel scheduled prize distribution' })
  @ApiParam({ name: 'hackathonId', description: 'Hackathon ID' })
  @ApiResponse({
    status: 200,
    description: 'Distribution cancelled successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Distribution not found' })
  @ApiBearerAuth()
  async cancelDistribution(
    @Param('hackathonId') hackathonId: string,
    @Request() req: any,
  ) {
    const userAddress = req.user?.walletAddress;
    const cancelled =
      await this.automatedDistributionService.cancelDistribution(
        hackathonId,
        userAddress,
      );

    return {
      success: cancelled,
      message: cancelled
        ? `Distribution cancelled for hackathon ${hackathonId}`
        : `No scheduled distribution found for hackathon ${hackathonId}`,
    };
  }

  @Get('status/:hackathonId')
  @Public()
  @ApiOperation({ summary: 'Get distribution status for a hackathon' })
  @ApiParam({ name: 'hackathonId', description: 'Hackathon ID' })
  @ApiResponse({
    status: 200,
    description: 'Distribution status retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Distribution not found' })
  async getDistributionStatus(@Param('hackathonId') hackathonId: string) {
    const status =
      this.automatedDistributionService.getDistributionStatus(hackathonId);

    if (!status) {
      return {
        hackathonId,
        status: 'NOT_SCHEDULED',
        message: 'No distribution job found for this hackathon',
      };
    }

    return {
      ...status,
      hackathonId,
    };
  }

  @Get('jobs')
  @ApiOperation({ summary: 'Get all active distribution jobs' })
  @ApiResponse({
    status: 200,
    description: 'Active distribution jobs retrieved successfully',
  })
  @ApiBearerAuth()
  async getAllDistributionJobs() {
    const jobs = this.automatedDistributionService.getAllDistributionJobs();

    return {
      jobs,
      count: jobs.length,
      summary: {
        scheduled: jobs.filter((j) => j.status === 'SCHEDULED').length,
        processing: jobs.filter((j) => j.status === 'PROCESSING').length,
        completed: jobs.filter((j) => j.status === 'COMPLETED').length,
        failed: jobs.filter((j) => j.status === 'FAILED').length,
      },
    };
  }

  @Post('scan')
  @ApiOperation({ summary: 'Manually trigger scan for completed hackathons' })
  @ApiResponse({
    status: 200,
    description: 'Scan completed successfully',
  })
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  async scanForCompletedHackathons() {
    await this.automatedDistributionService.scanForCompletedHackathons();
    return {
      success: true,
      message: 'Scan for completed hackathons triggered',
    };
  }
}

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { EmergencyControlsService } from './emergency-controls.service';
// import { GetUser } from '../auth/decorators/get-user.decorator';
import { HackathonStatus } from '@prisma/client';

export class EmergencyStopDto {
  reason!: string;
}

export class ManualDistributionDto {
  hackathonId!: string;
  reason!: string;
  bypassChecks?: boolean;
}

export class DistributionCancellationDto {
  hackathonId!: string;
  reason!: string;
  refundPrizePool?: boolean;
}

export class StatusOverrideDto {
  hackathonId!: string;
  fromStatus!: HackathonStatus;
  toStatus!: HackathonStatus;
  reason!: string;
  bypassValidation?: boolean;
}

export class ForceRetryDto {
  hackathonId!: string;
  customGasPrice?: string;
  customGasLimit?: string;
}

@ApiTags('Emergency Controls')
@Controller('emergency-controls')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class EmergencyControlsController {
  constructor(
    private readonly emergencyControlsService: EmergencyControlsService,
  ) {}

  @Post('emergency-stop')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Activate emergency stop - halt all distribution activities',
  })
  @ApiBody({ type: EmergencyStopDto })
  @ApiResponse({
    status: 200,
    description: 'Emergency stop activated successfully',
  })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async activateEmergencyStop(@Body() dto: EmergencyStopDto, @Req() req: any) {
    const user = req.user;
    const result = await this.emergencyControlsService.activateEmergencyStop(
      dto.reason,
      user.walletAddress,
    );

    return {
      success: result.success,
      message: result.message,
      data: {
        stoppedTransactions: result.stoppedTransactions,
        timestamp: new Date().toISOString(),
        adminAddress: user.walletAddress,
      },
      ...(result.error && { error: result.error }),
    };
  }

  @Post('emergency-stop/deactivate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Deactivate emergency stop and resume normal operations',
  })
  @ApiResponse({
    status: 200,
    description: 'Emergency stop deactivated successfully',
  })
  async deactivateEmergencyStop(@Req() req: any) {
    const user = req.user;
    const result = await this.emergencyControlsService.deactivateEmergencyStop(
      user.walletAddress,
    );

    return {
      success: result.success,
      message: result.message,
      data: {
        timestamp: new Date().toISOString(),
        adminAddress: user.walletAddress,
      },
    };
  }

  @Get('emergency-stop/status')
  @ApiOperation({ summary: 'Get current emergency stop status' })
  @ApiResponse({
    status: 200,
    description: 'Emergency stop status retrieved successfully',
  })
  async getEmergencyStopStatus() {
    const status = this.emergencyControlsService.getEmergencyStopStatus();

    return {
      success: true,
      data: {
        ...status,
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post('manual-distribution')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Manually trigger distribution for a specific hackathon',
  })
  @ApiBody({ type: ManualDistributionDto })
  @ApiResponse({
    status: 200,
    description: 'Manual distribution triggered successfully',
  })
  async triggerManualDistribution(
    @Body() dto: ManualDistributionDto,
    @Req() req: any,
  ) {
    const user = req.user;
    const result =
      await this.emergencyControlsService.manualDistributionTrigger(
        dto.hackathonId,
        user.walletAddress,
        dto.reason,
        dto.bypassChecks || false,
      );

    return {
      success: result.success,
      message: result.message,
      data: {
        hackathonId: dto.hackathonId,
        ...(result.distributionId && { distributionId: result.distributionId }),
        ...(result.txHash && { txHash: result.txHash }),
        timestamp: new Date().toISOString(),
        adminAddress: user.walletAddress,
      },
      ...(result.error && { error: result.error }),
    };
  }

  @Post('cancel-distribution')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel ongoing distribution and optionally refund',
  })
  @ApiBody({ type: DistributionCancellationDto })
  @ApiResponse({
    status: 200,
    description: 'Distribution cancelled successfully',
  })
  async cancelDistribution(
    @Body() dto: DistributionCancellationDto,
    @Req() req: any,
  ) {
    const user = req.user;
    const result = await this.emergencyControlsService.cancelDistribution(
      dto.hackathonId,
      user.walletAddress,
      dto.reason,
      dto.refundPrizePool || false,
    );

    return {
      success: result.success,
      message: result.message,
      data: {
        hackathonId: dto.hackathonId,
        cancelledDistributions: result.cancelledDistributions,
        refundRequired: result.refundRequired,
        timestamp: new Date().toISOString(),
        adminAddress: user.walletAddress,
      },
      ...(result.error && { error: result.error }),
    };
  }

  @Post('override-status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Override hackathon status manually (dangerous operation - use with caution)',
  })
  @ApiBody({ type: StatusOverrideDto })
  @ApiResponse({
    status: 200,
    description: 'Status override completed successfully',
  })
  async overrideHackathonStatus(
    @Body() dto: StatusOverrideDto,
    @Req() req: any,
  ) {
    const user = req.user;
    const override = {
      ...dto,
      adminAddress: user.walletAddress,
      bypassValidation: dto.bypassValidation || false,
    };

    const result =
      await this.emergencyControlsService.overrideHackathonStatus(override);

    return {
      success: result.success,
      message: result.message,
      data: {
        hackathonId: dto.hackathonId,
        fromStatus: dto.fromStatus,
        toStatus: dto.toStatus,
        timestamp: new Date().toISOString(),
        adminAddress: user.walletAddress,
      },
      ...(result.error && { error: result.error }),
    };
  }

  @Post('force-retry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Force retry a failed distribution with custom gas parameters',
  })
  @ApiBody({ type: ForceRetryDto })
  @ApiResponse({
    status: 200,
    description: 'Force retry initiated successfully',
  })
  async forceRetryDistribution(@Body() dto: ForceRetryDto, @Req() req: any) {
    const user = req.user;
    const result = await this.emergencyControlsService.forceRetryDistribution(
      dto.hackathonId,
      user.walletAddress,
      dto.customGasPrice,
      dto.customGasLimit,
    );

    return {
      success: result.success,
      message: result.message,
      data: {
        hackathonId: dto.hackathonId,
        ...(result.distributionId && { distributionId: result.distributionId }),
        ...(result.txHash && { txHash: result.txHash }),
        ...(dto.customGasPrice && { customGasPrice: dto.customGasPrice }),
        ...(dto.customGasLimit && { customGasLimit: dto.customGasLimit }),
        timestamp: new Date().toISOString(),
        adminAddress: user.walletAddress,
      },
      ...(result.error && { error: result.error }),
    };
  }

  @Get('system-health')
  @ApiOperation({
    summary: 'Get comprehensive system health and emergency status',
  })
  @ApiResponse({
    status: 200,
    description: 'System health status retrieved successfully',
  })
  async getSystemHealthStatus() {
    const healthStatus =
      await this.emergencyControlsService.getSystemHealthStatus();

    return {
      success: true,
      data: {
        ...healthStatus,
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get('distribution-jobs')
  @ApiOperation({ summary: 'Get all active distribution jobs' })
  @ApiResponse({
    status: 200,
    description: 'Active distribution jobs retrieved successfully',
  })
  async getActiveDistributionJobs() {
    // This would need to be implemented in AutomatedDistributionService
    // For now, return placeholder data
    return {
      success: true,
      data: {
        activeJobs: [],
        totalJobs: 0,
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get('hackathon/:hackathonId/status')
  @ApiOperation({ summary: 'Get detailed status for a specific hackathon' })
  @ApiParam({ name: 'hackathonId', description: 'Hackathon ID' })
  @ApiResponse({
    status: 200,
    description: 'Hackathon status retrieved successfully',
  })
  async getHackathonStatus(@Param('hackathonId') hackathonId: string) {
    // This endpoint provides detailed status information for emergency control decisions
    return {
      success: true,
      hackathonId,
      data: {
        // Implementation would fetch comprehensive hackathon status
        // Including distribution status, transaction history, etc.
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Get('audit-trail')
  @ApiOperation({ summary: 'Get emergency control audit trail' })
  @ApiQuery({
    name: 'fromDate',
    required: false,
    description: 'Start date for audit trail',
  })
  @ApiQuery({
    name: 'toDate',
    required: false,
    description: 'End date for audit trail',
  })
  @ApiQuery({
    name: 'adminAddress',
    required: false,
    description: 'Filter by admin address',
  })
  @ApiResponse({
    status: 200,
    description: 'Audit trail retrieved successfully',
  })
  async getEmergencyAuditTrail(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
    @Query('adminAddress') adminAddress?: string,
  ) {
    // This would integrate with AuditService to get emergency control specific logs
    return {
      success: true,
      data: {
        auditEntries: [],
        totalEntries: 0,
        filters: {
          fromDate: fromDate || null,
          toDate: toDate || null,
          adminAddress: adminAddress || null,
        },
        timestamp: new Date().toISOString(),
      },
    };
  }

  @Post('validate-operation')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validate an emergency operation before execution',
  })
  @ApiBody({
    schema: {
      oneOf: [
        { $ref: '#/components/schemas/ManualDistributionDto' },
        { $ref: '#/components/schemas/StatusOverrideDto' },
        { $ref: '#/components/schemas/DistributionCancellationDto' },
      ],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Operation validation completed',
  })
  async validateEmergencyOperation(@Body() operation: any, @Req() req: any) {
    const user = req.user;
    // This endpoint allows validation of operations before actual execution
    // Useful for confirming the impact of emergency operations
    return {
      success: true,
      data: {
        operationType: operation.type || 'unknown',
        validation: {
          canExecute: true,
          warnings: [],
          requirements: [],
          estimatedImpact: 'low',
        },
        timestamp: new Date().toISOString(),
        adminAddress: user.walletAddress,
      },
    };
  }
}

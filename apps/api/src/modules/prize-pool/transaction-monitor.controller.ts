import {
  Controller,
  Get,
  Param,
  UseGuards,
  Query,
  ParseIntPipe,
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
import { TransactionMonitorService } from './transaction-monitor.service';
import { DistributionStatus } from '@prisma/client';

@ApiTags('Transaction Monitor')
@Controller('transaction-monitor')
@UseGuards(JwtAuthGuard)
export class TransactionMonitorController {
  constructor(
    private readonly transactionMonitorService: TransactionMonitorService,
  ) {}

  @Get('transaction/:txHash')
  @Public()
  @ApiOperation({ summary: 'Get transaction details by hash' })
  @ApiParam({ name: 'txHash', description: 'Transaction hash' })
  @ApiResponse({
    status: 200,
    description: 'Transaction details retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async getTransactionDetails(@Param('txHash') txHash: string) {
    const transaction =
      await this.transactionMonitorService.getTransactionDetails(txHash);

    if (!transaction) {
      return {
        success: false,
        message: `Transaction ${txHash} not found`,
      };
    }

    // Get current blockchain status
    const blockchainStatus =
      await this.transactionMonitorService.checkTransactionStatus(txHash);

    return {
      success: true,
      transaction,
      blockchainStatus,
    };
  }

  @Get('hackathon/:hackathonId/transactions')
  @Public()
  @ApiOperation({ summary: 'Get all transactions for a hackathon' })
  @ApiParam({ name: 'hackathonId', description: 'Hackathon ID' })
  @ApiResponse({
    status: 200,
    description: 'Hackathon transactions retrieved successfully',
  })
  async getHackathonTransactions(@Param('hackathonId') hackathonId: string) {
    const transactions =
      await this.transactionMonitorService.getHackathonTransactions(
        hackathonId,
      );

    return {
      success: true,
      hackathonId,
      transactions,
      count: transactions.length,
      summary: {
        pending: transactions.filter(
          (tx) => tx.status === DistributionStatus.PENDING,
        ).length,
        completed: transactions.filter(
          (tx) => tx.status === DistributionStatus.COMPLETED,
        ).length,
        failed: transactions.filter(
          (tx) => tx.status === DistributionStatus.FAILED,
        ).length,
      },
    };
  }

  @Get('status/:txHash')
  @Public()
  @ApiOperation({ summary: 'Check blockchain status of a transaction' })
  @ApiParam({ name: 'txHash', description: 'Transaction hash' })
  @ApiResponse({
    status: 200,
    description: 'Transaction status checked successfully',
  })
  async checkTransactionStatus(@Param('txHash') txHash: string) {
    try {
      const status =
        await this.transactionMonitorService.checkTransactionStatus(txHash);

      return {
        success: true,
        txHash,
        ...status,
      };
    } catch (error) {
      return {
        success: false,
        txHash,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get transaction monitoring statistics' })
  @ApiResponse({
    status: 200,
    description: 'Monitoring statistics retrieved successfully',
  })
  @ApiBearerAuth()
  async getMonitoringStats() {
    const stats = await this.transactionMonitorService.getMonitoringStats();

    return {
      success: true,
      stats: {
        ...stats,
        successRateFormatted: `${stats.successRate.toFixed(2)}%`,
        averageConfirmationTimeFormatted: `${Math.round(stats.averageConfirmationTime)} seconds`,
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get('pending')
  @ApiOperation({ summary: 'Get all pending transactions being monitored' })
  @ApiResponse({
    status: 200,
    description: 'Pending transactions retrieved successfully',
  })
  @ApiBearerAuth()
  async getPendingTransactions() {
    const stats = await this.transactionMonitorService.getMonitoringStats();

    return {
      success: true,
      pendingCount: stats.pendingCount,
      message: `Currently monitoring ${stats.pendingCount} pending transactions`,
    };
  }

  @Get('health')
  @Public()
  @ApiOperation({ summary: 'Check transaction monitoring service health' })
  @ApiResponse({
    status: 200,
    description: 'Service health status',
  })
  async getHealthStatus() {
    const stats = await this.transactionMonitorService.getMonitoringStats();
    const isHealthy = stats.successRate >= 90; // Consider healthy if success rate >= 90%

    return {
      success: true,
      healthy: isHealthy,
      status: isHealthy ? 'operational' : 'degraded',
      metrics: {
        pendingTransactions: stats.pendingCount,
        totalTransactions: stats.totalTransactions,
        successRate: stats.successRate,
        averageConfirmationTime: stats.averageConfirmationTime,
      },
      timestamp: new Date().toISOString(),
    };
  }
}

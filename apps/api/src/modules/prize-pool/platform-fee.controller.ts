import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { PrizePoolService } from './prize-pool.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import {
  PlatformFeeInfo,
  PlatformFeeHistoryInfo,
  PlatformFeeCollectionInfo,
  FeeDistributionCalculation,
} from './prize-pool.service';

// DTOs for API requests
export class SetPlatformFeeRateDto {
  @ApiProperty({
    description: 'Fee rate in basis points (e.g., 250 = 2.5%)',
    example: 250,
  })
  feeRate!: number; // Fee rate in basis points (e.g., 250 = 2.5%)

  @ApiPropertyOptional({
    description: 'Optional reason for the change',
    example: 'Adjusting fee rate for Q4 promotion',
  })
  reason?: string; // Optional reason for the change
}

export class SetPlatformFeeRecipientDto {
  @ApiProperty({
    description: 'Wallet address to receive fees',
    example: '0x1234567890123456789012345678901234567890',
  })
  recipient!: string; // Wallet address to receive fees
}

export class PlatformFeeInfoResponseDto {
  @ApiProperty({
    description: 'Current fee rate in basis points',
    example: 250,
  })
  currentFeeRate!: number;

  @ApiProperty({
    description: 'Address receiving platform fees',
    example: '0x1234567890123456789012345678901234567890',
  })
  feeRecipient!: string;

  @ApiPropertyOptional({
    description: 'Last updated timestamp',
  })
  lastUpdated?: Date;
}

export class FeeDistributionResponseDto {
  @ApiProperty({
    description: 'Total prize pool amount',
    example: '10000000000000000000',
  })
  totalPrizePool!: string;

  @ApiProperty({
    description: 'Fee rate in basis points',
    example: 250,
  })
  feeRate!: number;

  @ApiProperty({
    description: 'Platform fee amount',
    example: '250000000000000000',
  })
  feeAmount!: string;

  @ApiProperty({
    description: 'Amount after fee deduction',
    example: '9750000000000000000',
  })
  distributionAmount!: string;

  @ApiProperty({
    description: 'Formatted platform fee amount',
    example: '0.25',
  })
  feeAmountFormatted!: string;

  @ApiProperty({
    description: 'Formatted distribution amount',
    example: '9.75',
  })
  distributionAmountFormatted!: string;
}

export class SetFeeRateResponseDto {
  @ApiProperty({
    description: 'Operation success status',
    example: true,
  })
  success!: boolean;

  @ApiProperty({
    description: 'Transaction hash',
    example: '0xabc123...',
  })
  txHash!: string;

  @ApiProperty({
    description: 'Success message',
    example: 'Platform fee rate updated to 2.5%',
  })
  message!: string;
}

@ApiTags('Platform Fee Management')
@Controller('api')
export class PlatformFeeController {
  constructor(private readonly prizePoolService: PrizePoolService) {}

  /**
   * Admin APIs - Require authentication and admin role
   */

  @Post('admin/platform-fee/rate')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update platform fee rate',
    description:
      'Update the platform fee rate for new prize pools (admin only)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Fee rate updated successfully',
    type: SetFeeRateResponseDto,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Admin access required',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid fee rate',
  })
  async setPlatformFeeRate(
    @Body() dto: SetPlatformFeeRateDto,
    @CurrentUser() user: { walletAddress: string },
  ): Promise<SetFeeRateResponseDto> {
    // Validate fee rate (0-5000 basis points = 0-50%)
    if (dto.feeRate < 0 || dto.feeRate > 5000) {
      throw new Error(
        'Fee rate must be between 0 and 5000 basis points (0-50%)',
      );
    }

    const result = await this.prizePoolService.setPlatformFeeRate(
      dto.feeRate,
      user.walletAddress,
      dto.reason,
    );

    return {
      success: true,
      txHash: result.txHash,
      message: `Platform fee rate updated to ${dto.feeRate / 100}%`,
    };
  }

  @Post('admin/platform-fee/recipient')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update platform fee recipient',
    description:
      'Update the wallet address that receives platform fees (admin only)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Fee recipient updated successfully',
    type: SetFeeRateResponseDto,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Admin access required',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid wallet address',
  })
  async setPlatformFeeRecipient(
    @Body() dto: SetPlatformFeeRecipientDto,
    @CurrentUser() user: { walletAddress: string },
  ): Promise<SetFeeRateResponseDto> {
    // Basic wallet address validation
    if (!dto.recipient.match(/^0x[a-fA-F0-9]{40}$/)) {
      throw new Error('Invalid wallet address format');
    }

    const result = await this.prizePoolService.setPlatformFeeRecipient(
      dto.recipient,
      user.walletAddress,
    );

    return {
      success: true,
      txHash: result.txHash,
      message: `Platform fee recipient updated to ${dto.recipient}`,
    };
  }

  @Get('admin/platform-fee/history')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get platform fee rate change history',
    description:
      'Retrieve the history of platform fee rate changes (admin only)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of records to return (default: 50)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Fee rate change history',
    type: 'PlatformFeeHistoryInfo',
    isArray: true,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Admin access required',
  })
  async getFeeHistory(
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 50,
  ): Promise<PlatformFeeHistoryInfo[]> {
    return this.prizePoolService.getFeeHistory(limit);
  }

  @Get('admin/fee-collections')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get platform fee collection records',
    description: 'Retrieve records of collected platform fees (admin only)',
  })
  @ApiQuery({
    name: 'hackathonId',
    required: false,
    type: String,
    description: 'Filter by specific hackathon ID',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of records to return (default: 50)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Fee collection records',
    type: 'PlatformFeeCollectionInfo',
    isArray: true,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Admin access required',
  })
  async getFeeCollections(
    @Query('hackathonId') hackathonId?: string,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 50,
  ): Promise<PlatformFeeCollectionInfo[]> {
    return this.prizePoolService.getFeeCollections(hackathonId, limit);
  }

  /**
   * Public APIs - No authentication required
   */

  @Get('platform/fee-info')
  @ApiOperation({
    summary: 'Get current platform fee information',
    description: 'Get the current platform fee rate and recipient address',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Current platform fee information',
    type: PlatformFeeInfoResponseDto,
  })
  async getPlatformFeeInfo(): Promise<PlatformFeeInfoResponseDto> {
    const feeInfo = await this.prizePoolService.getPlatformFeeInfo();
    return {
      currentFeeRate: feeInfo.currentFeeRate,
      feeRecipient: feeInfo.feeRecipient,
      ...(feeInfo.lastUpdated && { lastUpdated: feeInfo.lastUpdated }),
    };
  }

  @Get('hackathons/:hackathonId/fee-details')
  @ApiOperation({
    summary: 'Get hackathon-specific fee information',
    description: 'Get fee calculation details for a specific hackathon',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Hackathon fee details',
    type: FeeDistributionResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Hackathon or prize pool not found',
  })
  async getHackathonFeeDetails(
    @Param('hackathonId') hackathonId: string,
  ): Promise<FeeDistributionResponseDto> {
    const feeDetails =
      await this.prizePoolService.calculateFeeDistribution(hackathonId);
    return {
      totalPrizePool: feeDetails.totalPrizePool,
      feeRate: feeDetails.feeRate,
      feeAmount: feeDetails.feeAmount,
      distributionAmount: feeDetails.distributionAmount,
      feeAmountFormatted: feeDetails.feeAmountFormatted,
      distributionAmountFormatted: feeDetails.distributionAmountFormatted,
    };
  }
}

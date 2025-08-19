import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Patch,
  Request,
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
import { PrizePoolService } from './prize-pool.service';
import type {
  CreatePrizePoolDto,
  DepositToPrizePoolDto,
} from './prize-pool.service';

@ApiTags('Prize Pool')
@Controller('prize-pools')
@UseGuards(JwtAuthGuard)
export class PrizePoolController {
  constructor(private readonly prizePoolService: PrizePoolService) {}

  @Post()
  @ApiOperation({ summary: 'Create prize pool for hackathon' })
  @ApiResponse({
    status: 201,
    description: 'Prize pool created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Hackathon not found' })
  @ApiResponse({ status: 409, description: 'Prize pool already exists' })
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  async createPrizePool(@Body() createPrizePoolDto: CreatePrizePoolDto) {
    return this.prizePoolService.createPrizePool(createPrizePoolDto);
  }

  @Get('hackathon/:hackathonId')
  @Public()
  @ApiOperation({ summary: 'Get prize pool for hackathon' })
  @ApiParam({ name: 'hackathonId', description: 'Hackathon ID' })
  @ApiResponse({
    status: 200,
    description: 'Prize pool retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Prize pool not found' })
  async getPrizePool(@Param('hackathonId') hackathonId: string) {
    return this.prizePoolService.getPrizePool(hackathonId);
  }

  @Post('hackathon/:hackathonId/deposit')
  @ApiOperation({ summary: 'Record deposit to prize pool' })
  @ApiParam({ name: 'hackathonId', description: 'Hackathon ID' })
  @ApiResponse({
    status: 200,
    description: 'Deposit recorded successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Prize pool not found' })
  @ApiBearerAuth()
  async recordDeposit(
    @Param('hackathonId') hackathonId: string,
    @Body() depositDto: DepositToPrizePoolDto & { txHash: string },
  ) {
    return this.prizePoolService.recordDeposit(
      hackathonId,
      depositDto,
      depositDto.txHash,
    );
  }

  @Patch('deposits/:txHash/confirm')
  @ApiOperation({ summary: 'Confirm deposit transaction' })
  @ApiParam({ name: 'txHash', description: 'Transaction hash' })
  @ApiResponse({
    status: 200,
    description: 'Deposit confirmed successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Deposit not found' })
  @ApiBearerAuth()
  async confirmDeposit(
    @Param('txHash') txHash: string,
    @Body() confirmData?: { blockNumber?: number },
  ) {
    return this.prizePoolService.confirmDeposit(
      txHash,
      confirmData?.blockNumber,
    );
  }

  @Patch('deposits/:txHash/fail')
  @ApiOperation({ summary: 'Mark deposit as failed' })
  @ApiParam({ name: 'txHash', description: 'Transaction hash' })
  @ApiResponse({
    status: 200,
    description: 'Deposit marked as failed successfully',
  })
  @ApiResponse({ status: 404, description: 'Deposit not found' })
  @ApiBearerAuth()
  async failDeposit(@Param('txHash') txHash: string) {
    return this.prizePoolService.failDeposit(txHash);
  }

  @Get('hackathon/:hackathonId/balance')
  @Public()
  @ApiOperation({ summary: 'Get prize pool balance summary' })
  @ApiParam({ name: 'hackathonId', description: 'Hackathon ID' })
  @ApiResponse({
    status: 200,
    description: 'Balance summary retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Prize pool not found' })
  async getBalanceSummary(@Param('hackathonId') hackathonId: string) {
    return this.prizePoolService.getBalanceSummary(hackathonId);
  }

  @Get('hackathon/:hackathonId/validate-balance')
  @Public()
  @ApiOperation({
    summary: 'Validate if prize pool has sufficient balance for distribution',
  })
  @ApiParam({ name: 'hackathonId', description: 'Hackathon ID' })
  @ApiResponse({
    status: 200,
    description: 'Balance validation result',
  })
  async validateBalance(@Param('hackathonId') hackathonId: string) {
    const isValid =
      await this.prizePoolService.validateBalanceForDistribution(hackathonId);
    return { isValid, hackathonId };
  }
}

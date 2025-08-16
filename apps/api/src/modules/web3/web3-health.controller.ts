import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Web3Service } from './web3.service';
import { Public } from '../auth/decorators';

@ApiTags('Health')
@Controller('health')
export class Web3HealthController {
  constructor(private readonly web3Service: Web3Service) {}

  @Public()
  @Get('web3')
  @ApiOperation({
    summary: 'Check Web3 connection health',
    description: 'Verify blockchain connectivity and return network status',
  })
  @ApiResponse({
    status: 200,
    description: 'Web3 connection is healthy',
    schema: {
      example: {
        status: 'healthy',
        web3: {
          connected: true,
          chainId: 1001,
          chainName: 'Kaia Kairos Testnet',
          blockNumber: '12345678',
          gasPrice: '25000000000',
        },
        timestamp: '2025-08-16T12:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 503,
    description: 'Web3 connection is unhealthy',
    schema: {
      example: {
        status: 'unhealthy',
        web3: {
          connected: false,
          chainId: 1001,
          chainName: 'Kaia Kairos Testnet',
          blockNumber: '0',
          gasPrice: '0',
        },
        timestamp: '2025-08-16T12:00:00.000Z',
      },
    },
  })
  async checkWeb3(): Promise<any> {
    const healthInfo = await this.web3Service.healthCheck();
    const chain = this.web3Service.getChain();

    const response = {
      status: healthInfo.connected ? 'healthy' : 'unhealthy',
      web3: {
        connected: healthInfo.connected,
        chainId: healthInfo.chainId,
        chainName: chain.name,
        blockNumber: healthInfo.blockNumber.toString(),
        gasPrice: healthInfo.gasPrice.toString(),
      },
      timestamp: new Date().toISOString(),
    };

    return response;
  }
}

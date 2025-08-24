import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  LoginDto,
  LoginResponseDto,
  NonceRequestDto,
  NonceResponseDto,
} from './dto';
import { Public, CurrentUser } from './decorators';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('nonce')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate authentication nonce',
    description: 'Generate a unique nonce for wallet signature verification',
  })
  @ApiResponse({
    status: 200,
    description: 'Nonce generated successfully',
    type: NonceResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid wallet address',
  })
  async generateNonce(
    @Body() nonceRequest: NonceRequestDto,
  ): Promise<NonceResponseDto> {
    const { nonce, message } = this.authService.generateNonce(
      nonceRequest.address,
    );

    return {
      nonce,
      message,
      expiresIn: 300, // 5 minutes
    };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Authenticate with wallet signature',
    description:
      'Login using wallet address and signed message to receive JWT token',
  })
  @ApiResponse({
    status: 200,
    description: 'Authentication successful',
    type: LoginResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid signature or authentication failed',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data',
  })
  async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(loginDto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Retrieve authenticated user information',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing token',
  })
  async getProfile(@CurrentUser() user: any): Promise<any> {
    return {
      address: user.address,
      walletAddress: user.walletAddress,
    };
  }

  @Public()
  @Get('health')
  @ApiOperation({
    summary: 'Health check for authentication service',
  })
  @ApiResponse({
    status: 200,
    description: 'Authentication service is healthy',
  })
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}

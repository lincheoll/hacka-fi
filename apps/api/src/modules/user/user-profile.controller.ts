import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  ParseIntPipe,
  DefaultValuePipe,
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
import { UserProfileService } from './user-profile.service';
import {
  IsOptional,
  IsString,
  MaxLength,
  IsEthereumAddress,
  MinLength,
} from 'class-validator';

export class CreateUserProfileDto {
  @IsEthereumAddress()
  walletAddress!: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

export class UpdateUserProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  username?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

export class CheckUsernameDto {
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  username!: string;
}

@ApiTags('User Profiles')
@Controller('users')
export class UserProfileController {
  constructor(private readonly userProfileService: UserProfileService) {}

  @Get(':address')
  @ApiOperation({
    summary: 'Get user profile by wallet address',
  })
  @ApiParam({
    name: 'address',
    description: 'Wallet address',
    example: '0x742d35Cc3C0532925a3b8F474A738B2a3f7B6D75',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'User profile not found' })
  async getUserProfile(@Param('address') address: string) {
    const profile = await this.userProfileService.getProfile(address);

    if (!profile) {
      return {
        success: false,
        message: 'User profile not found',
        data: null,
      };
    }

    return {
      success: true,
      data: profile,
    };
  }

  @Get(':address/stats')
  @ApiOperation({
    summary: 'Get user profile with comprehensive statistics',
  })
  @ApiParam({
    name: 'address',
    description: 'Wallet address',
    example: '0x742d35Cc3C0532925a3b8F474A738B2a3f7B6D75',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile with statistics retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'User profile not found' })
  async getUserProfileWithStats(@Param('address') address: string) {
    const profileWithStats =
      await this.userProfileService.getProfileWithStats(address);

    if (!profileWithStats) {
      return {
        success: false,
        message: 'User profile not found',
        data: null,
      };
    }

    return {
      success: true,
      data: profileWithStats,
    };
  }

  @Get(':address/history')
  @ApiOperation({
    summary: 'Get user participation history',
  })
  @ApiParam({
    name: 'address',
    description: 'Wallet address',
    example: '0x742d35Cc3C0532925a3b8F474A738B2a3f7B6D75',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of records to return',
    example: 10,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Number of records to skip',
    example: 0,
  })
  @ApiResponse({
    status: 200,
    description: 'User participation history retrieved successfully',
  })
  async getUserParticipationHistory(
    @Param('address') address: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    const result = await this.userProfileService.getParticipationHistory(
      address,
      Math.min(limit, 50), // Cap at 50 records
      Math.max(offset, 0), // Ensure non-negative
    );

    return {
      success: true,
      data: {
        ...result,
        limit,
        offset,
      },
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create a new user profile',
  })
  @ApiBody({ type: CreateUserProfileDto })
  @ApiResponse({
    status: 201,
    description: 'User profile created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - username taken or invalid data',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async createUserProfile(
    @Body(ValidationPipe) createDto: CreateUserProfileDto,
    @Req() req: any,
  ) {
    // Ensure the user can only create profile for their own wallet
    const userWalletAddress = req.user.walletAddress.toLowerCase();
    const targetAddress = createDto.walletAddress.toLowerCase();

    if (userWalletAddress !== targetAddress) {
      return {
        success: false,
        message: 'You can only create a profile for your own wallet address',
      };
    }

    // Check if profile already exists
    const existingProfile =
      await this.userProfileService.getProfile(targetAddress);
    if (existingProfile) {
      return {
        success: false,
        message: 'Profile already exists for this wallet address',
        data: existingProfile,
      };
    }

    const profile = await this.userProfileService.createProfile(createDto);

    return {
      success: true,
      message: 'User profile created successfully',
      data: profile,
    };
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update current user profile',
  })
  @ApiBody({ type: UpdateUserProfileDto })
  @ApiResponse({
    status: 200,
    description: 'User profile updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - username taken or invalid data',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User profile not found' })
  async updateUserProfile(
    @Body(ValidationPipe) updateDto: UpdateUserProfileDto,
    @Req() req: any,
  ) {
    const userWalletAddress = req.user.walletAddress;

    const updatedProfile = await this.userProfileService.updateProfile(
      userWalletAddress,
      updateDto,
    );

    return {
      success: true,
      message: 'User profile updated successfully',
      data: updatedProfile,
    };
  }

  @Get('me/profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current user profile with stats',
  })
  @ApiResponse({
    status: 200,
    description: 'Current user profile retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentUserProfile(@Req() req: any) {
    const userWalletAddress = req.user.walletAddress;

    // Try to get profile with stats, create if doesn't exist
    let profileWithStats =
      await this.userProfileService.getProfileWithStats(userWalletAddress);

    if (!profileWithStats) {
      // Auto-create profile for authenticated user
      await this.userProfileService.getOrCreateProfile(userWalletAddress);
      profileWithStats =
        await this.userProfileService.getProfileWithStats(userWalletAddress);
    }

    return {
      success: true,
      data: profileWithStats,
    };
  }

  @Post('check-username')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check if username is available',
  })
  @ApiBody({ type: CheckUsernameDto })
  @ApiResponse({
    status: 200,
    description: 'Username availability checked',
  })
  async checkUsernameAvailability(
    @Body(ValidationPipe) checkDto: CheckUsernameDto,
  ) {
    const isAvailable = await this.userProfileService.isUsernameAvailable(
      checkDto.username,
    );

    return {
      success: true,
      data: {
        username: checkDto.username,
        available: isAvailable,
      },
    };
  }

  @Get()
  @ApiOperation({
    summary: 'Search users by username or address',
  })
  @ApiQuery({
    name: 'q',
    required: true,
    description: 'Search query (username or wallet address)',
    example: 'alice',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Number of records to return',
    example: 10,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Number of records to skip',
    example: 0,
  })
  @ApiResponse({
    status: 200,
    description: 'User search results retrieved successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - search query required',
  })
  async searchUsers(
    @Query('q') query: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    if (!query || query.trim().length === 0) {
      return {
        success: false,
        message: 'Search query is required',
      };
    }

    const result = await this.userProfileService.searchUsers(
      query.trim(),
      Math.min(limit, 50), // Cap at 50 records
      Math.max(offset, 0), // Ensure non-negative
    );

    return {
      success: true,
      data: {
        ...result,
        query: query.trim(),
        limit,
        offset,
      },
    };
  }

  @Post('initialize')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Initialize user profile for authenticated user (auto-create if not exists)',
  })
  @ApiResponse({
    status: 200,
    description: 'User profile initialized successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async initializeUserProfile(@Req() req: any) {
    const userWalletAddress = req.user.walletAddress;

    const profile =
      await this.userProfileService.getOrCreateProfile(userWalletAddress);

    return {
      success: true,
      message:
        profile.createdAt === profile.updatedAt
          ? 'User profile created successfully'
          : 'User profile already exists',
      data: profile,
    };
  }

  @Get(':address/participations')
  @ApiOperation({
    summary: 'Get user participations by wallet address',
  })
  @ApiParam({
    name: 'address',
    description: 'Wallet address',
    example: '0x742d35Cc3C0532925a3b8F474A738B2a3f7B6D75',
  })
  @ApiResponse({
    status: 200,
    description: 'User participations retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserParticipations(@Param('address') address: string) {
    const participations =
      await this.userProfileService.getUserParticipations(address);
    return participations;
  }

  @Get(':address/hackathons')
  @ApiOperation({
    summary: 'Get hackathons created by user',
  })
  @ApiParam({
    name: 'address',
    description: 'Wallet address',
    example: '0x742d35Cc3C0532925a3b8F474A738B2a3f7B6D75',
  })
  @ApiResponse({
    status: 200,
    description: 'User hackathons retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserHackathons(@Param('address') address: string) {
    const hackathons = await this.userProfileService.getUserHackathons(address);
    return hackathons;
  }
}

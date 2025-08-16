import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { verifyMessage } from 'viem';
import { LoginDto, LoginResponseDto } from './dto';

export interface JwtPayload {
  sub: string; // wallet address
  address: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto): Promise<LoginResponseDto> {
    const { address, signature, message } = loginDto;

    // Verify wallet signature
    const isValid = await this.verifySignature(address, message, signature);
    if (!isValid) {
      throw new UnauthorizedException('Invalid signature');
    }

    // Generate JWT token
    const payload: JwtPayload = {
      sub: address,
      address: address.toLowerCase(),
    };

    const accessToken = await this.jwtService.signAsync(payload);
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN', '1d');

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.parseExpirationTime(expiresIn),
      address: address.toLowerCase(),
    };
  }

  async verifySignature(
    address: string,
    message: string,
    signature: string,
  ): Promise<boolean> {
    try {
      const isValid = await verifyMessage({
        address: address as `0x${string}`,
        message,
        signature: signature as `0x${string}`,
      });

      this.logger.debug(`Signature verification for ${address}: ${isValid}`);
      return isValid;
    } catch (error) {
      this.logger.error(`Signature verification failed:`, error);
      return false;
    }
  }

  async validateUser(payload: JwtPayload): Promise<any> {
    // In a real application, you might want to check if the user exists in database
    // For now, we'll just return the payload if it's valid
    if (payload.sub && payload.address) {
      return {
        address: payload.address,
        walletAddress: payload.sub,
      };
    }
    return null;
  }

  private parseExpirationTime(expiresIn: string): number {
    // Convert JWT expiration string to seconds
    const timeUnit = expiresIn.slice(-1);
    const timeValue = parseInt(expiresIn.slice(0, -1), 10);

    switch (timeUnit) {
      case 's':
        return timeValue;
      case 'm':
        return timeValue * 60;
      case 'h':
        return timeValue * 60 * 60;
      case 'd':
        return timeValue * 60 * 60 * 24;
      default:
        return 86400; // 1 day default
    }
  }
}

import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { verifyMessage } from 'viem';
import { LoginDto, LoginResponseDto } from './dto';
import { randomBytes } from 'crypto';

export interface JwtPayload {
  sub: string; // wallet address
  address: string;
  iat?: number;
  exp?: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly nonceStore = new Map<
    string,
    { nonce: string; timestamp: number }
  >();

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generate a unique nonce for wallet authentication
   */
  generateNonce(address: string): { nonce: string; message: string } {
    const nonce = randomBytes(16).toString('hex');
    const timestamp = Date.now();

    // Store nonce with 5-minute expiration
    this.nonceStore.set(address.toLowerCase(), { nonce, timestamp });

    // Clean expired nonces
    this.cleanExpiredNonces();

    const message = `Welcome to Hacka-Fi!\n\nClick to sign in and accept the Terms of Service.\n\nThis request will not trigger a blockchain transaction or cost any gas fees.\n\nWallet address:\n${address}\n\nNonce:\n${nonce}`;

    this.logger.debug(`Generated nonce for address ${address}: ${nonce}`);

    return { nonce, message };
  }

  async login(loginDto: LoginDto): Promise<LoginResponseDto> {
    const { address, signature, message } = loginDto;

    // Verify the message contains a valid nonce
    const storedData = this.nonceStore.get(address.toLowerCase());
    if (!storedData) {
      throw new UnauthorizedException('No nonce found for this address');
    }

    // Check if nonce is expired (5 minutes)
    const now = Date.now();
    if (now - storedData.timestamp > 5 * 60 * 1000) {
      this.nonceStore.delete(address.toLowerCase());
      throw new UnauthorizedException('Nonce has expired');
    }

    // Verify the message contains the correct nonce
    if (!message.includes(storedData.nonce)) {
      throw new UnauthorizedException('Invalid nonce in message');
    }

    // Verify wallet signature
    const isValid = await this.verifySignature(address, message, signature);
    if (!isValid) {
      throw new UnauthorizedException('Invalid signature');
    }

    // Remove used nonce
    this.nonceStore.delete(address.toLowerCase());

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

  /**
   * Clean expired nonces from the store
   */
  private cleanExpiredNonces(): void {
    const now = Date.now();
    const expiredAddresses: string[] = [];

    this.nonceStore.forEach((data, address) => {
      if (now - data.timestamp > 5 * 60 * 1000) {
        // 5 minutes
        expiredAddresses.push(address);
      }
    });

    expiredAddresses.forEach((address) => {
      this.nonceStore.delete(address);
    });

    if (expiredAddresses.length > 0) {
      this.logger.debug(`Cleaned ${expiredAddresses.length} expired nonces`);
    }
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

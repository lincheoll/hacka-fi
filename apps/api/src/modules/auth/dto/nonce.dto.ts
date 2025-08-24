import { IsEthereumAddress } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class NonceRequestDto {
  @ApiProperty({
    description: 'Wallet address to generate nonce for',
    example: '0x1234567890123456789012345678901234567890',
  })
  @IsEthereumAddress()
  address!: string;
}

export class NonceResponseDto {
  @ApiProperty({
    description: 'Generated nonce for signing',
    example: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
  })
  nonce!: string;

  @ApiProperty({
    description: 'Message to be signed by the wallet',
    example:
      'Welcome to Hacka-Fi!\\n\\nClick to sign in and accept the Terms of Service...',
  })
  message!: string;

  @ApiProperty({
    description: 'Expiration time in seconds',
    example: 300,
  })
  expiresIn!: number;
}

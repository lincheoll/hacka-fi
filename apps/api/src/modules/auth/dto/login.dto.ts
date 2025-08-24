import { IsString, IsEthereumAddress, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'Wallet address (Ethereum format)',
    example: '0x1234567890123456789012345678901234567890',
  })
  @IsEthereumAddress()
  address!: string;

  @ApiProperty({
    description: 'Signed message from wallet',
    example: '0x...',
  })
  @IsString()
  @Length(1, 500)
  signature!: string;

  @ApiProperty({
    description: 'Original message that was signed',
    example: 'Welcome to Hacka-Fi!\n\nClick to sign in and accept the Terms of Service...',
  })
  @IsString()
  @Length(1, 500)
  message!: string;
}

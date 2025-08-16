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
    example: 'Login to Hacka-Fi with nonce: 12345',
  })
  @IsString()
  @Length(1, 200)
  message!: string;
}

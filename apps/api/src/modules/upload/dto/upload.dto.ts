import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, IsEnum, Min, Max } from 'class-validator';

export class FileUploadDto {
  @ApiProperty({
    description: 'File type category',
    example: 'hackathon-covers',
    enum: ['hackathon-covers', 'submissions', 'profiles', 'general'],
  })
  @IsString()
  @IsEnum(['hackathon-covers', 'submissions', 'profiles', 'general'])
  type!: string;

  @ApiPropertyOptional({
    description: 'Entity ID associated with the file',
    example: 'hackathon_123',
  })
  @IsOptional()
  @IsString()
  entityId?: string;
}

export class ImageUploadDto extends FileUploadDto {
  @ApiPropertyOptional({
    description: 'Target width for image resizing',
    example: 800,
    minimum: 50,
    maximum: 4096,
  })
  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(4096)
  width?: number;

  @ApiPropertyOptional({
    description: 'Target height for image resizing',
    example: 600,
    minimum: 50,
    maximum: 4096,
  })
  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(4096)
  height?: number;

  @ApiPropertyOptional({
    description: 'Image quality (1-100)',
    example: 80,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  quality?: number;

  @ApiPropertyOptional({
    description: 'Output image format',
    example: 'jpeg',
    enum: ['jpeg', 'png', 'webp'],
  })
  @IsOptional()
  @IsEnum(['jpeg', 'png', 'webp'])
  format?: 'jpeg' | 'png' | 'webp';
}

export class FileResponseDto {
  @ApiProperty({
    description: 'Generated filename',
    example: 'file-1234567890-123456789.jpg',
  })
  filename!: string;

  @ApiProperty({
    description: 'Original filename',
    example: 'hackathon-cover.jpg',
  })
  originalName!: string;

  @ApiProperty({
    description: 'File MIME type',
    example: 'image/jpeg',
  })
  mimetype!: string;

  @ApiProperty({
    description: 'File size in bytes',
    example: 245760,
  })
  size!: number;

  @ApiProperty({
    description: 'Public URL to access the file',
    example: 'http://localhost:3004/uploads/hackathon-covers/file-1234567890-123456789.jpg',
  })
  url!: string;

  @ApiProperty({
    description: 'File type category',
    example: 'hackathon-covers',
  })
  type!: string;
}

export class MultipleFileResponseDto {
  @ApiProperty({
    description: 'Array of uploaded file information',
    type: [FileResponseDto],
  })
  files!: FileResponseDto[];

  @ApiProperty({
    description: 'Number of successfully uploaded files',
    example: 3,
  })
  count!: number;
}
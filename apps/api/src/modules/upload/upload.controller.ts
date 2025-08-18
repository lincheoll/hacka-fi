import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  UseGuards,
  Query,
  BadRequestException,
  NotFoundException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { UploadService } from './upload.service';
import { 
  FileUploadDto, 
  ImageUploadDto, 
  FileResponseDto, 
  MultipleFileResponseDto 
} from './dto/upload.dto';

@ApiTags('File Upload')
@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Upload a single file',
    description: 'Upload a single file with basic processing',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload',
        },
        type: {
          type: 'string',
          enum: ['hackathon-covers', 'submissions', 'profiles', 'general'],
          description: 'File type category',
        },
        entityId: {
          type: 'string',
          description: 'Optional entity ID',
        },
      },
      required: ['file', 'type'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'File uploaded successfully',
    type: FileResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - invalid file or parameters',
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: FileUploadDto,
  ): Promise<FileResponseDto> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const result = this.uploadService.processUploadedFile(file, uploadDto.type);
    return result;
  }

  @Post('multiple')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Upload multiple files',
    description: 'Upload multiple files at once',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Files to upload',
        },
        type: {
          type: 'string',
          enum: ['hackathon-covers', 'submissions', 'profiles', 'general'],
          description: 'File type category',
        },
        entityId: {
          type: 'string',
          description: 'Optional entity ID',
        },
      },
      required: ['files', 'type'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Files uploaded successfully',
    type: MultipleFileResponseDto,
  })
  @UseInterceptors(FilesInterceptor('files', 5)) // Max 5 files
  async uploadFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() uploadDto: FileUploadDto,
  ): Promise<MultipleFileResponseDto> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    const results = this.uploadService.processUploadedFiles(files, uploadDto.type);
    
    return {
      files: results,
      count: results.length,
    };
  }

  @Post('image')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Upload and process image',
    description: 'Upload an image with optional resizing and optimization',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file to upload',
        },
        type: {
          type: 'string',
          enum: ['hackathon-covers', 'submissions', 'profiles', 'general'],
          description: 'File type category',
        },
        entityId: {
          type: 'string',
          description: 'Optional entity ID',
        },
        width: {
          type: 'number',
          description: 'Target width',
          minimum: 50,
          maximum: 4096,
        },
        height: {
          type: 'number',
          description: 'Target height',
          minimum: 50,
          maximum: 4096,
        },
        quality: {
          type: 'number',
          description: 'Image quality (1-100)',
          minimum: 1,
          maximum: 100,
        },
        format: {
          type: 'string',
          enum: ['jpeg', 'png', 'webp'],
          description: 'Output format',
        },
      },
      required: ['file', 'type'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Image uploaded and processed successfully',
    type: FileResponseDto,
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadDto: ImageUploadDto,
  ): Promise<FileResponseDto> {
    if (!file) {
      throw new BadRequestException('No image file uploaded');
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('File must be an image');
    }

    const options: any = {};
    if (uploadDto.width) options.width = Number(uploadDto.width);
    if (uploadDto.height) options.height = Number(uploadDto.height);
    if (uploadDto.quality) options.quality = Number(uploadDto.quality);
    if (uploadDto.format) options.format = uploadDto.format;

    const result = await this.uploadService.processImage(file, options, uploadDto.type);
    return result;
  }

  @Get('info/:type/:filename')
  @Public()
  @ApiOperation({
    summary: 'Get file information',
    description: 'Get metadata about an uploaded file',
  })
  @ApiParam({
    name: 'type',
    description: 'File type category',
    enum: ['hackathon-covers', 'submissions', 'profiles', 'general'],
  })
  @ApiParam({
    name: 'filename',
    description: 'Filename',
    example: 'file-1234567890-123456789.jpg',
  })
  @ApiResponse({
    status: 200,
    description: 'File information retrieved successfully',
    type: FileResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'File not found',
  })
  async getFileInfo(
    @Param('type') type: string,
    @Param('filename') filename: string,
  ): Promise<FileResponseDto> {
    const fileInfo = this.uploadService.getFileInfo(filename, type);
    
    if (!fileInfo) {
      throw new NotFoundException(`File not found: ${filename}`);
    }

    return fileInfo;
  }

  @Delete(':type/:filename')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete uploaded file',
    description: 'Delete an uploaded file from the server',
  })
  @ApiParam({
    name: 'type',
    description: 'File type category',
    enum: ['hackathon-covers', 'submissions', 'profiles', 'general'],
  })
  @ApiParam({
    name: 'filename',
    description: 'Filename to delete',
    example: 'file-1234567890-123456789.jpg',
  })
  @ApiResponse({
    status: 204,
    description: 'File deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'File not found',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFile(
    @Param('type') type: string,
    @Param('filename') filename: string,
  ): Promise<void> {
    await this.uploadService.deleteFile(filename, type);
  }

  @Get('health')
  @Public()
  @ApiOperation({
    summary: 'Upload service health check',
    description: 'Check if the upload service is working properly',
  })
  @ApiResponse({
    status: 200,
    description: 'Upload service is healthy',
  })
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }
}
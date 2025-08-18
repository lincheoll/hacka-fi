import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { join, extname } from 'path';
import { existsSync, unlinkSync, statSync } from 'fs';
import sharp from 'sharp';

export interface FileUploadResult {
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  path: string;
  url: string;
  type: string;
}

export interface ImageProcessingOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly baseUrl: string;
  private readonly uploadPath: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>(
      'API_BASE_URL',
      'http://localhost:3004',
    );
    this.uploadPath = join(process.cwd(), 'uploads');
  }

  /**
   * Process uploaded file and return metadata
   */
  processUploadedFile(
    file: Express.Multer.File,
    type: string = 'general',
  ): FileUploadResult {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const relativePath = file.path
      .replace(this.uploadPath, '')
      .replace(/\\/g, '/');
    const url = `${this.baseUrl}/uploads${relativePath}`;

    this.logger.log(`File uploaded: ${file.filename} (${file.size} bytes)`);

    return {
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
      url,
      type,
    };
  }

  /**
   * Process multiple uploaded files
   */
  processUploadedFiles(
    files: Express.Multer.File[],
    type: string = 'general',
  ): FileUploadResult[] {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    return files.map((file) => this.processUploadedFile(file, type));
  }

  /**
   * Process and optimize image
   */
  async processImage(
    file: Express.Multer.File,
    options: ImageProcessingOptions = {},
    type: string = 'images',
  ): Promise<FileUploadResult> {
    if (!file) {
      throw new BadRequestException('No image file uploaded');
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('File must be an image');
    }

    try {
      const { width, height, quality = 80, format = 'jpeg' } = options;

      // Create optimized filename
      const ext = format === 'jpeg' ? '.jpg' : `.${format}`;
      const optimizedFilename = file.filename.replace(
        extname(file.filename),
        ext,
      );
      const optimizedPath = join(file.destination, optimizedFilename);

      // Process image with Sharp
      let processor = sharp(file.path);

      if (width || height) {
        processor = processor.resize(width, height, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      // Apply format and quality
      switch (format) {
        case 'jpeg':
          processor = processor.jpeg({ quality });
          break;
        case 'png':
          processor = processor.png({ quality });
          break;
        case 'webp':
          processor = processor.webp({ quality });
          break;
      }

      await processor.toFile(optimizedPath);

      // Remove original file if different from optimized
      if (file.path !== optimizedPath) {
        try {
          unlinkSync(file.path);
        } catch (error) {
          this.logger.warn(`Failed to delete original file: ${file.path}`);
        }
      }

      // Get optimized file stats
      const stats = statSync(optimizedPath);
      const relativePath = optimizedPath
        .replace(this.uploadPath, '')
        .replace(/\\/g, '/');
      const url = `${this.baseUrl}/uploads${relativePath}`;

      this.logger.log(
        `Image processed: ${optimizedFilename} (${stats.size} bytes)`,
      );

      return {
        filename: optimizedFilename,
        originalName: file.originalname,
        mimetype: `image/${format}`,
        size: stats.size,
        path: optimizedPath,
        url,
        type,
      };
    } catch (error) {
      this.logger.error('Image processing failed:', error);

      // Fallback to original file if processing fails
      return this.processUploadedFile(file, type);
    }
  }

  /**
   * Delete uploaded file
   */
  async deleteFile(filename: string, type: string = 'general'): Promise<void> {
    const filePath = join(this.uploadPath, type, filename);

    if (!existsSync(filePath)) {
      throw new NotFoundException(`File not found: ${filename}`);
    }

    try {
      unlinkSync(filePath);
      this.logger.log(`File deleted: ${filename}`);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${filename}`, error);
      throw new BadRequestException(`Failed to delete file: ${filename}`);
    }
  }

  /**
   * Get file info
   */
  getFileInfo(
    filename: string,
    type: string = 'general',
  ): FileUploadResult | null {
    const filePath = join(this.uploadPath, type, filename);

    if (!existsSync(filePath)) {
      return null;
    }

    try {
      const stats = statSync(filePath);
      const relativePath = filePath
        .replace(this.uploadPath, '')
        .replace(/\\/g, '/');
      const url = `${this.baseUrl}/uploads${relativePath}`;

      return {
        filename,
        originalName: filename,
        mimetype: this.getMimeType(filename),
        size: stats.size,
        path: filePath,
        url,
        type,
      };
    } catch (error) {
      this.logger.error(`Failed to get file info: ${filename}`, error);
      return null;
    }
  }

  /**
   * Get MIME type from filename extension
   */
  private getMimeType(filename: string): string {
    const ext = extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.json': 'application/json',
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }

  /**
   * Validate file type
   */
  validateFileType(file: Express.Multer.File, allowedTypes: string[]): boolean {
    return allowedTypes.includes(file.mimetype);
  }

  /**
   * Validate file size
   */
  validateFileSize(file: Express.Multer.File, maxSizeInBytes: number): boolean {
    return file.size <= maxSizeInBytes;
  }
}

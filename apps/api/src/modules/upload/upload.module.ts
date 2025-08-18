import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

@Module({
  imports: [
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        // Create uploads directory if it doesn't exist
        const uploadPath = join(process.cwd(), 'uploads');
        if (!existsSync(uploadPath)) {
          mkdirSync(uploadPath, { recursive: true });
        }

        return {
          storage: diskStorage({
            destination: (req, file, cb) => {
              const type = req.body.type || 'general';
              const typePath = join(uploadPath, type);
              
              if (!existsSync(typePath)) {
                mkdirSync(typePath, { recursive: true });
              }
              
              cb(null, typePath);
            },
            filename: (req, file, cb) => {
              // Generate unique filename with original extension
              const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
              const ext = extname(file.originalname);
              const filename = `${file.fieldname}-${uniqueSuffix}${ext}`;
              cb(null, filename);
            },
          }),
          fileFilter: (req, file, cb) => {
            // Basic file type validation
            const allowedMimes = [
              'image/jpeg',
              'image/png', 
              'image/webp',
              'image/gif',
              'application/pdf',
              'text/plain',
              'application/json',
            ];
            
            if (allowedMimes.includes(file.mimetype)) {
              cb(null, true);
            } else {
              cb(new Error(`File type ${file.mimetype} not allowed`), false);
            }
          },
          limits: {
            fileSize: 10 * 1024 * 1024, // 10MB limit
            files: 5, // Max 5 files per upload
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
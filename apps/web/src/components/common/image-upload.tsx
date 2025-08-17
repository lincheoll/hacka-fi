'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Upload, X, ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  value?: string | File;
  onChange: (file: File | null, preview?: string) => void;
  onError?: (error: string) => void;
  accept?: string;
  maxSize?: number; // in bytes
  width?: number;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  variant?: 'square' | 'rectangle' | 'circle';
}

export function ImageUpload({
  value,
  onChange,
  onError,
  accept = 'image/jpeg,image/png,image/webp',
  maxSize = 5 * 1024 * 1024, // 5MB
  width = 400,
  className,
  placeholder = 'Click to upload or drag and drop',
  disabled = false,
  variant = 'rectangle',
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(
    typeof value === 'string' ? value : null
  );
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    // Check file type
    const allowedTypes = accept.split(',').map(type => type.trim());
    if (!allowedTypes.includes(file.type)) {
      return 'Invalid file type. Please upload a JPEG, PNG, or WebP image.';
    }

    // Check file size
    if (file.size > maxSize) {
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
      return `File size too large. Maximum size is ${maxSizeMB}MB.`;
    }

    return null;
  }, [accept, maxSize]);

  const processFile = useCallback(async (file: File) => {
    setIsUploading(true);
    setError(null);

    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      setIsUploading(false);
      onError?.(validationError);
      return;
    }

    try {
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);
      onChange(file, previewUrl);
    } catch {
      const errorMessage = 'Failed to process image';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsUploading(false);
    }
  }, [validateFile, onChange, onError]);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    processFile(file);
  }, [processFile]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(event.target.files);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    
    if (disabled) return;
    
    handleFileSelect(event.dataTransfer.files);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRemove = (event: React.MouseEvent) => {
    event.stopPropagation();
    setPreview(null);
    setError(null);
    onChange(null);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getAspectRatio = () => {
    switch (variant) {
      case 'square':
        return 'aspect-square';
      case 'circle':
        return 'aspect-square';
      case 'rectangle':
      default:
        return 'aspect-[2/1]';
    }
  };

  const getImageClasses = () => {
    const base = 'object-cover';
    switch (variant) {
      case 'circle':
        return `${base} rounded-full`;
      case 'square':
      case 'rectangle':
      default:
        return `${base} rounded-lg`;
    }
  };

  return (
    <div className={cn('w-full', className)}>
      <Card className={cn(
        'relative border-2 border-dashed transition-all duration-200 cursor-pointer group',
        isDragging && 'border-blue-500 bg-blue-50',
        disabled && 'opacity-50 cursor-not-allowed',
        error && 'border-red-500 bg-red-50',
        !preview && 'hover:border-gray-400'
      )}>
        <CardContent 
          className={cn(
            'p-0 relative overflow-hidden',
            getAspectRatio()
          )}
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {preview ? (
            <>
              <Image
                src={preview}
                alt="Preview"
                fill
                className={getImageClasses()}
                sizes={`${width}px`}
              />
              
              {/* Remove button */}
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handleRemove}
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </Button>

              {/* Loading overlay */}
              {isUploading && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-white animate-spin" />
                </div>
              )}
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center">
              {isUploading ? (
                <>
                  <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
                  <p className="text-sm text-gray-600">Uploading...</p>
                </>
              ) : (
                <>
                  {isDragging ? (
                    <Upload className="h-12 w-12 text-blue-500 mb-4" />
                  ) : (
                    <ImageIcon className="h-12 w-12 text-gray-400 mb-4" />
                  )}
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-700">
                      {isDragging ? 'Drop image here' : placeholder}
                    </p>
                    <p className="text-xs text-gray-500">
                      JPEG, PNG, or WebP up to {(maxSize / (1024 * 1024)).toFixed(1)}MB
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleInputChange}
            className="hidden"
            disabled={disabled}
          />
        </CardContent>
      </Card>

      {/* Error message */}
      {error && (
        <Alert className="mt-2 border-red-500 bg-red-50">
          <AlertDescription className="text-red-700 text-sm">
            {error}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
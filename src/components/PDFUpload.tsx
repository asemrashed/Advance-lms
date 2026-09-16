'use client';

import { useState, useRef, useEffect } from 'react';
import { usePDFUpload } from '@/hooks/usePDFUpload';
import { Button } from '@/components/ui/button';
import { LuFileText as LuFileText, LuUpload as Upload, LuX as X, LuLoader as Loader2, LuCheck as CheckCircle, LuTriangleAlert as AlertCircle } from 'react-icons/lu';;

export interface PDFUploadProps {
  currentPDF?: string | null;
  onPDFChange?: (pdfUrl: string, publicId: string) => void;
  onPDFRemove?: () => void;
  onError?: (error: string) => void;
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  folder?: string;
  description?: string;
  className?: string;
  accept?: string;
  maxSize?: number; // in MB
}

const sizeClasses = {
  sm: 'w-16 h-16',
  md: 'w-20 h-20',
  lg: 'w-24 h-24'
};

const iconSizes = {
  sm: 'w-6 h-6',
  md: 'w-8 h-8',
  lg: 'w-10 h-10'
};

export default function PDFUpload({
  currentPDF,
  onPDFChange,
  onPDFRemove,
  onError,
  size = 'md',
  disabled = false,
  folder = 'lms/documents',
  description = '',
  className = '',
  accept = '.pdf',
  maxSize = 50
}: PDFUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadPDF, isUploading, uploadProgress, error, reset } = usePDFUpload();
  const [preview, setPreview] = useState<string | null>(currentPDF || null);
  const [dragActive, setDragActive] = useState(false);

  // Update preview when currentPDF changes
  useEffect(() => {
    setPreview(currentPDF || null);
  }, [currentPDF]);

  const handleFileSelect = async (file: File) => {
    if (disabled || isUploading) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      const errorMsg = 'Please select a PDF file';
      onError?.(errorMsg);
      return;
    }

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      const errorMsg = `File size must be less than ${maxSize}MB`;
      onError?.(errorMsg);
      return;
    }

    try {
      const result = await uploadPDF(file, {
        folder,
        description,
        onProgress: (progress) => {
          // Progress is handled by the hook
        },
        onSuccess: (result) => {
          if (result.pdf) {
            setPreview(result.pdf.url);
            onPDFChange?.(result.pdf.url, result.pdf.publicId);
          }
        },
        onError: (error) => {
          onError?.(error);
        }
      });

      if (!result.success) {
        onError?.(result.error || 'Upload failed');
      }
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Upload failed');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (disabled || isUploading) return;

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onPDFRemove?.();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleUploadClick = () => {
    if (disabled || isUploading) return;
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={`relative ${className}`}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {/* Upload area */}
      <div
        className={`
          ${sizeClasses[size]} 
          relative rounded-lg border-2 border-dashed transition-all duration-200 cursor-pointer
          ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${isUploading ? 'cursor-wait' : ''}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={handleUploadClick}
      >
        {preview ? (
          // PDF preview
          <div className="w-full h-full flex flex-col items-center justify-center p-2">
            <LuFileText className={`${iconSizes[size]} text-red-600 mb-1`} />
            <span className="text-xs text-gray-600 text-center truncate w-full">
              PDF
            </span>
            {!disabled && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove();
                }}
                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ) : (
          // Upload placeholder
          <div className="w-full h-full flex flex-col items-center justify-center p-2">
            {isUploading ? (
              <>
                <Loader2 className={`${iconSizes[size]} text-blue-500 animate-spin mb-1`} />
                <div className="text-center">
                  <div className="text-xs font-semibold text-blue-600 mb-1">
                    {uploadProgress}%
                  </div>
                  <div className="text-xs text-gray-500">
                    Uploading...
                  </div>
                </div>
              </>
            ) : (
              <>
                <Upload className={`${iconSizes[size]} text-gray-400 mb-1`} />
                <span className="text-xs text-gray-500 text-center">
                  Upload PDF
                </span>
              </>
            )}
          </div>
        )}

        {/* Loading overlay */}
        {isUploading && (
          <div className="absolute inset-0 bg-white bg-opacity-90 rounded-lg flex items-center justify-center">
            <div className="text-center">
              <Loader2 className={`${iconSizes[size]} text-blue-500 animate-spin mx-auto mb-2`} />
              <div className="text-sm font-bold text-blue-600 mb-1">
                {uploadProgress}%
              </div>
              <div className="text-xs text-gray-600">
                Uploading PDF...
              </div>
            </div>
          </div>
        )}

        {/* Progress bar */}
        {isUploading && (
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-gray-200 rounded-b-lg overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-300 ease-out shadow-sm"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-2 flex items-center gap-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-md">
          <AlertCircle className="w-3 h-3" />
          <span>{error}</span>
          <button
            onClick={() => reset()}
            className="ml-auto hover:text-red-700"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Upload button */}
      {!preview && !isUploading && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleUploadClick}
          disabled={disabled}
          className="mt-2 w-full opacity-0"
        >
          <Upload className="w-4 h-4 mr-2" />
          Choose PDF File
        </Button>
      )}

      {/* File info */}
      {preview && (
        <div className="mt-2 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-green-500" />
            <span>PDF uploaded successfully</span>
          </div>
        </div>
      )}
    </div>
  );
}

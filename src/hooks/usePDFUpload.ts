import { useState, useCallback } from 'react';

export interface PDFUploadResult {
  success: boolean;
  pdf?: {
    publicId: string;
    url: string;
    secureUrl: string;
    fileName: string;
    size: number;
    uploadedAt: string;
    uploadedBy: string;
    folder: string;
    description: string;
  };
  error?: string;
}

export interface PDFUploadOptions {
  folder?: string;
  description?: string;
  onProgress?: (progress: number) => void;
  onSuccess?: (result: PDFUploadResult) => void;
  onError?: (error: string) => void;
}

export const usePDFUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const uploadPDF = useCallback(async (
    file: File,
    options: PDFUploadOptions = {}
  ): Promise<PDFUploadResult> => {
    const {
      folder = 'lms/documents',
      description = '',
      onProgress,
      onSuccess,
      onError
    } = options;

    // Reset state
    setIsUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      // Validate file
      if (!file) {
        throw new Error('No file provided');
      }

      if (file.type !== 'application/pdf') {
        throw new Error('Only PDF files are allowed');
      }

      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        throw new Error('File size too large. Maximum size is 50MB');
      }

      // Create form data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);
      formData.append('description', description);

      // Create XMLHttpRequest for progress tracking
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // Track upload progress
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(progress);
            onProgress?.(progress);
          }
        });

        // Handle successful upload
        xhr.addEventListener('load', () => {
          if (xhr.status === 200) {
            try {
              const result = JSON.parse(xhr.responseText);
              if (result.success) {
                onSuccess?.(result);
                resolve(result);
              } else {
                const errorMsg = result.error || 'Upload failed';
                setError(errorMsg);
                onError?.(errorMsg);
                reject(new Error(errorMsg));
              }
            } catch (parseError) {
              const errorMsg = 'Failed to parse server response';
              setError(errorMsg);
              onError?.(errorMsg);
              reject(new Error(errorMsg));
            }
          } else {
            try {
              const errorResult = JSON.parse(xhr.responseText);
              const errorMsg = errorResult.error || `Upload failed with status ${xhr.status}`;
              setError(errorMsg);
              onError?.(errorMsg);
              reject(new Error(errorMsg));
            } catch (parseError) {
              const errorMsg = `Upload failed with status ${xhr.status}`;
              setError(errorMsg);
              onError?.(errorMsg);
              reject(new Error(errorMsg));
            }
          }
        });

        // Handle upload error
        xhr.addEventListener('error', () => {
          const errorMsg = 'Network error during upload';
          setError(errorMsg);
          onError?.(errorMsg);
          reject(new Error(errorMsg));
        });

        // Handle upload timeout
        xhr.addEventListener('timeout', () => {
          const errorMsg = 'Upload timeout';
          setError(errorMsg);
          onError?.(errorMsg);
          reject(new Error(errorMsg));
        });

        // Configure and send request
        xhr.open('POST', '/api/upload/pdf');
        xhr.timeout = 60000; // 60 seconds timeout
        xhr.send(formData);
      });

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMsg);
      onError?.(errorMsg);
      return {
        success: false,
        error: errorMsg
      };
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, []);

  const deletePDF = useCallback(async (publicId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/upload/pdf?publicId=${encodeURIComponent(publicId)}`, {
        method: 'DELETE',
      });

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Error deleting PDF:', error);
      return false;
    }
  }, []);

  const getPDFInfo = useCallback(async (publicId: string): Promise<PDFUploadResult | null> => {
    try {
      const response = await fetch(`/api/upload/pdf?publicId=${encodeURIComponent(publicId)}`);
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error getting PDF info:', error);
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setIsUploading(false);
    setUploadProgress(0);
    setError(null);
  }, []);

  return {
    uploadPDF,
    deletePDF,
    getPDFInfo,
    isUploading,
    uploadProgress,
    error,
    reset
  };
};

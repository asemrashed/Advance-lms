import { useState } from 'react';
import { useAppDispatch } from '@/lib/hooks';

interface UploadResult {
  success: boolean;
  imageUrl?: string;
  publicId?: string;
  message?: string;
  error?: string;
}

export const useAvatarUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const dispatch = useAppDispatch();

  const uploadAvatar = async (file: File): Promise<UploadResult | null> => {
    if (!file) {
      console.error('No file selected');
      return null;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      console.error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.');
      return null;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      console.error('File too large. Maximum size is 5MB.');
      return null;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      // Create XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();
      
      const response = await new Promise<Response>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percentComplete);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(new Response(xhr.responseText, {
              status: xhr.status,
              statusText: xhr.statusText,
              headers: new Headers({
                'Content-Type': 'application/json'
              })
            }));
          } else {
            reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Network error'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload aborted'));
        });

        xhr.open('POST', '/api/upload/avatar');
        xhr.send(formData);
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      console.log('Avatar uploaded successfully:', result.message);

      return result;
    } catch (error) {
      console.error('Avatar upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      console.error('Upload failed:', errorMessage);

      return { success: false, error: errorMessage };
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const deleteAvatar = async (publicId: string): Promise<boolean> => {
    if (!publicId) {
      console.error('No public ID provided');
      return false;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/upload/avatar?publicId=${publicId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Delete failed');
      }

      console.log('Avatar deleted successfully:', result.message);

      return true;
    } catch (error) {
      console.error('Avatar delete error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Delete failed';
      
      console.error('Delete failed:', errorMessage);

      return false;
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    uploadAvatar,
    deleteAvatar,
    isUploading,
    isDeleting,
    uploadProgress,
  };
};

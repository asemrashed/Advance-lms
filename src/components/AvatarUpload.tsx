'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { LuUpload as Upload, LuX as X, LuUser as User, LuLoader as Loader2 } from 'react-icons/lu';;
import { useAvatarUpload } from '@/hooks/useAvatarUpload';
import Image from 'next/image';

interface AvatarUploadProps {
  currentAvatar?: string;
  onAvatarChange?: (imageUrl: string, publicId: string) => void;
  onAvatarRemove?: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
}

export default function AvatarUpload({
  currentAvatar,
  onAvatarChange,
  onAvatarRemove,
  size = 'md',
  className = '',
  disabled = false
}: AvatarUploadProps) {
  const [preview, setPreview] = useState<string | null>(currentAvatar || null);
  const [publicId, setPublicId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadAvatar, deleteAvatar, isUploading, isDeleting, uploadProgress } = useAvatarUpload();

  // Update preview when currentAvatar changes
  useEffect(() => {
    setPreview(currentAvatar || null);
  }, [currentAvatar]);

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  };

  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  const handleLuFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload via API (S3 when configured, else local disk)
    const result = await uploadAvatar(file);
    if (result?.success && result.imageUrl) {
      setPublicId(result.publicId || null);
      onAvatarChange?.(result.imageUrl, result.publicId || '');
    }
  };

  const handleRemoveAvatar = async () => {
    if (publicId) {
      const success = await deleteAvatar(publicId);
      if (success) {
        setPreview(null);
        setPublicId(null);
        onAvatarRemove?.();
      }
    } else {
      setPreview(null);
      setPublicId(null);
      onAvatarRemove?.();
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={`flex flex-col items-center space-y-4 ${className}`}>
      {/* Avatar Display */}
      <div className={`relative ${sizeClasses[size]} rounded-full overflow-hidden border-2 border-gray-200 bg-gray-100`}>
        {preview ? (
          <Image
            src={preview}
            alt="Avatar preview"
            fill
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <User className={`${iconSizes[size]} text-gray-400`} />
          </div>
        )}
        
        {/* Loading Overlay */}
        {(isUploading || isDeleting) && (
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center">
            <Loader2 className={`${iconSizes[size]} text-white animate-spin mb-2`} />
            {isUploading && (
              <div className="text-white text-xs font-medium">
                {uploadProgress}%
              </div>
            )}
          </div>
        )}
      </div>

      {/* Progress Bar */}
      {isUploading && (
        <div className="w-full max-w-48">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex space-x-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleUploadClick}
          disabled={disabled || isUploading || isDeleting}
          className="flex items-center space-x-2"
        >
          <Upload className="w-4 h-4" />
          <span>
            {isUploading ? `Uploading... ${uploadProgress}%` : 'Upload'}
          </span>
        </Button>

        {preview && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRemoveAvatar}
            disabled={disabled || isUploading || isDeleting}
            className="flex items-center space-x-2 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <X className="w-4 h-4" />
            <span>{isDeleting ? 'Removing...' : 'Remove'}</span>
          </Button>
        )}
      </div>

      {/* Hidden LuFile Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        onChange={handleLuFileSelect}
        className="hidden"
        disabled={disabled || isUploading || isDeleting}
      />

      {/* LuFile LuInfo */}
      <div className="text-xs text-gray-500 text-center">
        <p>Max size: 5MB</p>
        <p>Formats: JPEG, PNG, GIF, WebP</p>
      </div>
    </div>
  );
}

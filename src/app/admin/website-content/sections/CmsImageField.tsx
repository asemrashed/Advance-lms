'use client';

import { ImageSourceField } from '@/components/ui/ImageSourceField';
import { UPLOAD_ENDPOINTS } from '@/lib/uploadImage';

interface CmsImageFieldProps {
  label?: string;
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  hint?: string;
  previewAlt?: string;
}

export function CmsImageField({
  label = 'Image',
  value,
  onChange,
  placeholder = 'https://...',
  hint,
}: CmsImageFieldProps) {
  return (
    <ImageSourceField
      label={label}
      value={value}
      onChange={onChange}
      uploadEndpoint={UPLOAD_ENDPOINTS.cmsImage}
      urlPlaceholder={placeholder}
      hint={hint ?? 'Upload from your device or paste an image URL.'}
    />
  );
}

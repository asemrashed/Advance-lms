"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { uploadImageFile, UPLOAD_ENDPOINTS, deleteUploadedFile, isManagedUploadUrl } from "@/lib/uploadImage";
import { imageUrlError } from "@/lib/imageUrl";
import { resolveImageSrc } from "@/lib/resolveImageSrc";
import { LuImage as ImageIcon, LuUpload } from "react-icons/lu";
import { cn } from "@/lib/utils";

type ImageSourceMode = "file" | "url";

type ImageSourceFieldProps = {
  label?: string;
  value: string;
  onChange: (url: string) => void;
  uploadEndpoint?: string;
  disabled?: boolean;
  hint?: string;
  urlPlaceholder?: string;
  className?: string;
};

export function ImageSourceField({
  label = "Image",
  value,
  onChange,
  uploadEndpoint = UPLOAD_ENDPOINTS.courseThumbnail,
  disabled = false,
  hint,
  urlPlaceholder = "https://...",
  className,
}: ImageSourceFieldProps) {
  const fieldId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<ImageSourceMode>(() =>
    value && /^https?:\/\//i.test(value) && !value.includes("/uploads/")
      ? "url"
      : "file",
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [urlDraft, setUrlDraft] = useState(
    value.startsWith("data:") ? "" : value,
  );
  const [urlError, setUrlError] = useState<string | null>(null);
  const [previewBroken, setPreviewBroken] = useState(false);

  useEffect(() => {
    setUrlDraft(value.startsWith("data:") ? "" : value);
    setUrlError(null);
    setPreviewBroken(false);
  }, [value]);

  const handleUrlInput = (raw: string) => {
    setUrlDraft(raw);
    const trimmed = raw.trim();
    if (!trimmed) {
      setUrlError(null);
      onChange("");
      return;
    }

    // Immediate warning for insecure links; do not commit them.
    if (/^http:\/\//i.test(trimmed)) {
      setUrlError(imageUrlError(trimmed));
      return;
    }

    const error = imageUrlError(trimmed);
    if (error) {
      // Still typing an incomplete https URL — wait until blur to warn.
      setUrlError(null);
      return;
    }

    setUrlError(null);
    onChange(trimmed);
  };

  const handleUrlBlur = () => {
    const trimmed = urlDraft.trim();
    if (!trimmed) {
      setUrlError(null);
      onChange("");
      return;
    }
    const error = imageUrlError(trimmed);
    if (error) {
      setUrlError(error);
      return;
    }
    setUrlError(null);
    onChange(trimmed);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("Please choose an image file (PNG, JPG, WEBP, or GIF).");
      event.target.value = "";
      return;
    }

    setUploadError(null);
    setUploading(true);
    try {
      const previous = value.trim();
      const url = await uploadImageFile(file, uploadEndpoint);
      if (previous && isManagedUploadUrl(previous) && previous !== url) {
        void deleteUploadedFile(previous).catch(() => {});
      }
      onChange(url);
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Failed to upload image",
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const previewSrc = value ? resolveImageSrc(value) : "";

  return (
    <div className={cn("space-y-3", className)}>
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-4">
        <label
          htmlFor={`${fieldId}-file`}
          className="flex cursor-pointer items-center gap-2 text-sm"
        >
          <input
            id={`${fieldId}-file`}
            type="radio"
            name={`${fieldId}-source`}
            checked={mode === "file"}
            onChange={() => setMode("file")}
            disabled={disabled || uploading}
            className="cursor-pointer"
          />
          Upload file
        </label>
        <label
          htmlFor={`${fieldId}-url`}
          className="flex cursor-pointer items-center gap-2 text-sm"
        >
          <input
            id={`${fieldId}-url`}
            type="radio"
            name={`${fieldId}-source`}
            checked={mode === "url"}
            onChange={() => setMode("url")}
            disabled={disabled || uploading}
            className="cursor-pointer"
          />
          Image link
        </label>
      </div>

      {mode === "file" ? (
        <div className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            disabled={disabled || uploading}
            onChange={handleFileSelect}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || uploading}
            className="cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <LuUpload className="h-4 w-4" />
            {uploading ? "Uploading…" : "Choose image"}
          </Button>
          <p className="text-xs text-muted-foreground">
            PNG, JPG, WEBP, or GIF — up to 5MB
          </p>
          {uploadError ? (
            <p className="text-xs text-destructive">{uploadError}</p>
          ) : null}
        </div>
      ) : (
        <div className="space-y-1.5">
          <Input
            type="url"
            value={urlDraft}
            onChange={(e) => handleUrlInput(e.target.value)}
            onBlur={handleUrlBlur}
            placeholder={urlPlaceholder}
            disabled={disabled || uploading}
            aria-invalid={Boolean(urlError)}
          />
          <p className="text-xs text-muted-foreground">
            Only HTTPS links are allowed (not HTTP).
          </p>
          {urlError ? (
            <p className="text-xs text-destructive" role="alert">
              {urlError}
            </p>
          ) : null}
        </div>
      )}

      {value && !value.startsWith("data:") && previewSrc && !previewBroken ? (
        <div className="relative mt-1 h-24 w-full max-w-xs overflow-hidden rounded-lg border bg-muted/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewSrc}
            alt="Preview"
            className="h-full w-full object-contain p-1"
            onError={() => setPreviewBroken(true)}
          />
        </div>
      ) : value.startsWith("data:") ? (
        <div className="relative mt-1 h-24 w-full max-w-xs overflow-hidden rounded-lg border bg-muted/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Preview" className="h-full w-full object-contain p-1" />
        </div>
      ) : mode === "file" && !value ? (
        <div className="flex h-20 w-full max-w-xs items-center justify-center rounded-lg border border-dashed bg-muted/20 text-muted-foreground">
          <ImageIcon className="h-6 w-6 opacity-50" />
        </div>
      ) : previewBroken ? (
        <p className="text-xs text-destructive">
          Preview could not load. The image URL may be invalid or unavailable.
        </p>
      ) : null}

      {value ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="cursor-pointer"
          disabled={disabled || uploading}
          onClick={() => {
            if (value && isManagedUploadUrl(value)) {
              void deleteUploadedFile(value).catch(() => {});
            }
            onChange("");
          }}
        >
          Remove image
        </Button>
      ) : null}
    </div>
  );
}

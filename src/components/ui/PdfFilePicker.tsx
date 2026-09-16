"use client";

import { useRef, type RefObject } from "react";
import { Button } from "@/components/ui/button";
import { LuUpload } from "react-icons/lu";
import { cn } from "@/lib/utils";

type PdfFilePickerProps = {
  label: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  inputRef?: RefObject<HTMLInputElement | null>;
  accept?: string;
  className?: string;
};

export function PdfFilePicker({
  label,
  file,
  onFileChange,
  inputRef,
  accept = "application/pdf,.pdf",
  className,
}: PdfFilePickerProps) {
  const internalRef = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? internalRef;

  return (
    <div className={cn("rounded-lg border border-dashed p-4", className)}>
      <p className="mb-2 text-sm font-medium">{label}</p>
      <input
        ref={ref}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          onFileChange(e.target.files?.[0] || null);
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="cursor-pointer"
        onClick={() => ref.current?.click()}
      >
        <LuUpload className="h-4 w-4" />
        Choose PDF
      </Button>
      {file ? (
        <p className="mt-2 text-xs text-muted-foreground">
          {file.name} ({Math.round(file.size / 1024)} KB)
        </p>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">No file selected</p>
      )}
    </div>
  );
}

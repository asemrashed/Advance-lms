"use client";

interface VideoWatermarkProps {
  text?: string;
  moving?: boolean;
  includeInstituteText?: boolean;
}

export default function VideoWatermark({
  text,
}: VideoWatermarkProps) {
  const extraText = text?.trim();
  const displayText = extraText || '';

  if (!displayText) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[9999] overflow-hidden">
      <div className="video-watermark-float">
        <span className="video-watermark-item">{displayText}</span>
      </div>
    </div>
  );
}

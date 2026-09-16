"use client";

import { useEffect, useState } from "react";
import SecureVideoPlayer from "@/components/SecureVideoPlayer";
import { cn } from "@/lib/cn";
import { LuMaximize, LuMinimize, LuX } from "react-icons/lu";

type VideoPlayerModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  youtubeVideoId?: string;
  videoUrl?: string;
};

export function VideoPlayerModal({
  open,
  onOpenChange,
  title,
  youtubeVideoId,
  videoUrl,
}: VideoPlayerModalProps) {
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!open) setFullscreen(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (fullscreen) {
          setFullscreen(false);
        } else {
          onOpenChange(false);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, fullscreen, onOpenChange]);

  if (!open) return null;

  const close = () => {
    setFullscreen(false);
    onOpenChange(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="absolute inset-0" onClick={close} aria-hidden />

      <div
        className={cn(
          "relative z-10 bg-card border border-border/85 shadow-2xl transition-all duration-300",
          fullscreen
            ? "fixed inset-0 flex h-screen w-screen flex-col justify-between rounded-none border-0 bg-black/95 p-0"
            : "w-full max-w-2xl rounded-2xl p-4 sm:p-6 animate-in zoom-in-95 duration-200",
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div
          className={cn(
            "mb-4 flex items-center justify-between border-b border-border/30 px-1 pb-3 pt-1",
            fullscreen && "border-white/15 px-4 pt-3 text-white",
          )}
        >
          <div className="min-w-0 max-w-[70%]">
            <h3
              className={cn(
                "truncate text-base font-bold text-foreground",
                fullscreen && "text-white",
              )}
            >
              {title}
            </h3>
            <p
              className={cn(
                "mt-0.5 text-xs text-muted-foreground",
                fullscreen && "text-white/60",
              )}
            >
              Recorded class
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFullscreen((value) => !value)}
              className={cn(
                "rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                fullscreen && "hover:bg-white/10 hover:text-white",
              )}
              title={fullscreen ? "Exit Fullscreen" : "Fullscreen View"}
              aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {fullscreen ? (
                <LuMinimize className="h-5 w-5" />
              ) : (
                <LuMaximize className="h-5 w-5" />
              )}
            </button>
            <button
              type="button"
              onClick={close}
              className={cn(
                "rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                fullscreen && "hover:bg-white/10 hover:text-white",
              )}
              aria-label="Close"
            >
              <LuX className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div
          className={cn(
            "relative flex w-full aspect-video items-center justify-center overflow-hidden rounded-xl bg-black",
            fullscreen && "flex-1 rounded-none",
          )}
        >
          {youtubeVideoId || videoUrl ? (
            <SecureVideoPlayer
              youtubeVideoId={youtubeVideoId}
              videoUrl={videoUrl}
              autoplay
              className={cn("h-full w-full", !fullscreen && "rounded-xl")}
            />
          ) : (
            <p className="p-8 text-center text-sm text-white/70">
              No playable video is attached to this lesson.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default VideoPlayerModal;

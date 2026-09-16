"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { loadPdfDocument } from "@/lib/pdfjsClient";
import {
  LuDownload,
  LuLoader,
  LuMaximize,
  LuMinimize,
  LuX,
  LuZoomIn,
  LuZoomOut,
} from "react-icons/lu";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.25;
const DEFAULT_ZOOM = 1;

type ResourcePdfViewerModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  pdfUrl: string | null;
  loading?: boolean;
  error?: string | null;
  downloadHref?: string | null;
};

function PdfPagesContent({
  pdfUrl,
  scale,
  className,
}: {
  pdfUrl: string;
  scale: number;
  className?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const lastFitWidth = useRef(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);

  useEffect(() => {
    let cancelled = false;
    pageRefs.current.clear();
    setNumPages(0);
    setLoading(true);
    setError(null);

    async function loadDocument() {
      try {
        const doc = await loadPdfDocument(pdfUrl);
        if (cancelled) return;
        setNumPages(doc.numPages);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load PDF");
          setLoading(false);
        }
      }
    }

    void loadDocument();
    return () => {
      cancelled = true;
    };
  }, [pdfUrl]);

  const renderPages = useCallback(async () => {
    if (numPages === 0) return;

    const missing = Array.from({ length: numPages }, (_, i) => i + 1).filter(
      (n) => !pageRefs.current.get(n),
    );
    if (missing.length > 0) return;

    setLoading(true);
    setError(null);

    try {
      const doc = await loadPdfDocument(pdfUrl);

      for (let pageNumber = 1; pageNumber <= numPages; pageNumber++) {
        const container = pageRefs.current.get(pageNumber);
        if (!container) continue;

        const page = await doc.getPage(pageNumber);
        const baseViewport = page.getViewport({ scale: 1 });
        const availableWidth = Math.max(
          (scrollRef.current?.clientWidth || 0) - 24,
          280,
        );
        lastFitWidth.current = availableWidth;
        const fitScale = availableWidth / baseViewport.width;
        const viewport = page.getViewport({ scale: fitScale * scale });
        const outputScale = Math.min(window.devicePixelRatio || 1, 3);

        let canvas = container.querySelector("canvas");
        if (!canvas) {
          canvas = document.createElement("canvas");
          container.innerHTML = "";
          container.appendChild(canvas);
        }

        const context = canvas.getContext("2d", { alpha: false });
        if (!context) continue;

        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        canvas.className = "block max-w-none bg-white";

        await page.render({
          canvasContext: context,
          viewport,
          transform:
            outputScale !== 1
              ? [outputScale, 0, 0, outputScale, 0, 0]
              : undefined,
        }).promise;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to render PDF");
    } finally {
      setLoading(false);
    }
  }, [numPages, pdfUrl, scale]);

  useEffect(() => {
    if (numPages === 0) return;
    let debounce: number | undefined;
    const schedule = (force = false) => {
      const nextWidth = Math.max(
        (scrollRef.current?.clientWidth || 0) - 24,
        280,
      );
      if (
        !force &&
        lastFitWidth.current &&
        Math.abs(nextWidth - lastFitWidth.current) < 4
      ) {
        return;
      }
      window.clearTimeout(debounce);
      debounce = window.setTimeout(() => void renderPages(), 80);
    };
    schedule(true);
    const el = scrollRef.current;
    const observer =
      typeof ResizeObserver !== "undefined" && el
        ? new ResizeObserver(() => schedule(false))
        : null;
    if (el) observer?.observe(el);
    return () => {
      window.clearTimeout(debounce);
      observer?.disconnect();
    };
  }, [numPages, renderPages, scale]);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-sm text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className={cn(
        "relative h-full overflow-auto overscroll-contain bg-muted/30 touch-pan-x touch-pan-y",
        className,
      )}
    >
      {loading ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-muted/30 text-sm text-muted-foreground">
          <LuLoader className="h-5 w-5 animate-spin" />
          Loading PDF...
        </div>
      ) : null}
      <div className="mx-auto flex w-full flex-col items-center gap-4 p-3 sm:p-4">
        {Array.from({ length: numPages }, (_, i) => i + 1).map((pageNumber) => (
          <div
            key={pageNumber}
            ref={(el) => {
              if (el) pageRefs.current.set(pageNumber, el);
            }}
            className="overflow-hidden rounded-lg bg-white shadow-sm"
          />
        ))}
      </div>
    </div>
  );
}

export function ResourcePdfViewerModal({
  open,
  onOpenChange,
  title,
  pdfUrl,
  loading = false,
  error = null,
  downloadHref = null,
}: ResourcePdfViewerModalProps) {
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!open) {
      setZoom(DEFAULT_ZOOM);
      setFullscreen(false);
      return;
    }
    const mobile = window.matchMedia("(max-width: 640px)").matches;
    setFullscreen(mobile);
  }, [open]);

  const zoomIn = () => setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP));
  const zoomOut = () => setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="z-[100] backdrop-blur-sm" />
        <DialogPrimitive.Content
          className={cn(
            "fixed z-[100] flex flex-col overflow-hidden border border-border bg-background shadow-2xl duration-200",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            fullscreen
              ? "inset-0 h-svh w-svw max-w-none rounded-none"
              : "left-1/2 top-1/2 h-[min(90vh,820px)] w-[min(95vw,1100px)] max-w-none -translate-x-1/2 -translate-y-1/2 rounded-2xl data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          )}
        >
          <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-muted/30 px-3 py-2.5 sm:gap-3 sm:px-5 sm:py-3">
            <h2 className="min-w-0 truncate text-sm font-semibold text-foreground sm:text-lg">
              {title}
            </h2>
            <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={zoomOut}
                disabled={zoom <= MIN_ZOOM || loading || !pdfUrl}
                aria-label="Zoom out"
              >
                <LuZoomOut className="h-4 w-4" />
              </Button>
              <span className="w-12 text-center text-xs text-muted-foreground">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={zoomIn}
                disabled={zoom >= MAX_ZOOM || loading || !pdfUrl}
                aria-label="Zoom in"
              >
                <LuZoomIn className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => setFullscreen((v) => !v)}
                aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              >
                {fullscreen ? (
                  <LuMinimize className="h-4 w-4" />
                ) : (
                  <LuMaximize className="h-4 w-4" />
                )}
              </Button>
              {downloadHref ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  asChild
                  aria-label="Download"
                >
                  <a href={downloadHref} target="_blank" rel="noopener noreferrer">
                    <LuDownload className="h-4 w-4" />
                  </a>
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => onOpenChange(false)}
                aria-label="Close"
              >
                <LuX className="h-4 w-4" />
              </Button>
            </div>
          </header>

          <div className="min-h-0 flex-1">
            {loading ? (
              <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
                <LuLoader className="h-5 w-5 animate-spin" />
                Preparing document...
              </div>
            ) : error ? (
              <div className="flex h-full items-center justify-center p-6 text-sm text-destructive">
                {error}
              </div>
            ) : pdfUrl ? (
              <PdfPagesContent pdfUrl={pdfUrl} scale={zoom} className="h-full" />
            ) : null}
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

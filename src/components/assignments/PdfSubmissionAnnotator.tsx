'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  Dialog,
  DialogClose,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type {
  PdfAnnotationLayer,
  PdfAnnotationStroke,
  PdfAnnotations,
} from '@/types/assignment';
import {
  LuEraser as Eraser,
  LuExpand as Expand,
  LuHand as Hand,
  LuLoader as Loader2,
  LuPencil as Pencil,
  LuRedo2 as Redo2,
  LuUndo2 as Undo2,
  LuX as X,
} from 'react-icons/lu';
import { loadPdfDocument, toDurablePdfPath } from '@/lib/pdfjsClient';

type Props = {
  pdfUrl: string;
  value?: PdfAnnotations | null;
  onChange?: (value: PdfAnnotations) => void;
  readOnly?: boolean;
  className?: string;
};

type PageRefs = {
  wrap: HTMLDivElement;
  pdfCanvas: HTMLCanvasElement;
  overlayCanvas: HTMLCanvasElement;
};

function layerForFile(
  fileUrl: string,
  annotations?: PdfAnnotations | null,
): PdfAnnotationLayer {
  const existing = annotations?.layers?.find((l) => l.fileUrl === fileUrl);
  return (
    existing ?? {
      fileUrl,
      strokes: [],
      canvasWidth: 1,
      canvasHeight: 1,
    }
  );
}

function strokePage(stroke: PdfAnnotationStroke): number {
  return stroke.page && stroke.page > 0 ? stroke.page : 1;
}

function strokesForPage(layer: PdfAnnotationLayer, pageNumber: number) {
  return layer.strokes.filter((s) => strokePage(s) === pageNumber);
}

function drawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: PdfAnnotationStroke,
  width: number,
  height: number,
) {
  if (stroke.points.length < 4) return;
  ctx.strokeStyle = stroke.color;
  ctx.lineWidth = stroke.width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(stroke.points[0] * width, stroke.points[1] * height);
  for (let i = 2; i < stroke.points.length; i += 2) {
    ctx.lineTo(stroke.points[i] * width, stroke.points[i + 1] * height);
  }
  ctx.stroke();
}

function paintOverlay(
  canvas: HTMLCanvasElement,
  layer: PdfAnnotationLayer,
  pageNumber: number,
) {
  const wrap = canvas.parentElement;
  if (!wrap) return;
  const width = Math.max(Math.floor(wrap.clientWidth), 1);
  const height = Math.max(Math.floor(wrap.clientHeight), 1);
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, width, height);
  for (const stroke of strokesForPage(layer, pageNumber)) {
    drawStroke(ctx, stroke, width, height);
  }
}

type ViewerProps = {
  pdfUrl: string;
  layer: PdfAnnotationLayer;
  drawMode: boolean;
  readOnly: boolean;
  color: string;
  lineWidth: number;
  scrollClassName?: string;
  onLayerChange: (layer: PdfAnnotationLayer) => void;
};

function PdfPagesViewer({
  pdfUrl,
  layer,
  drawMode,
  readOnly,
  color,
  lineWidth,
  scrollClassName = 'max-h-[min(70vh,560px)]',
  onLayerChange,
}: ViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Map<number, PageRefs>>(new Map());
  const drawingRef = useRef(false);
  const activePageRef = useRef(1);
  const currentStrokeRef = useRef<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState(0);
  // Serve via /api/files/... — static /uploads often 404s on live.
  const durableUrl = toDurablePdfPath(pdfUrl);

  const repaintPage = useCallback(
    (pageNumber: number) => {
      const refs = pageRefs.current.get(pageNumber);
      if (!refs) return;
      paintOverlay(refs.overlayCanvas, layer, pageNumber);
    },
    [layer],
  );

  const repaintAll = useCallback(() => {
    pageRefs.current.forEach((_, pageNumber) => repaintPage(pageNumber));
  }, [repaintPage]);

  useEffect(() => {
    repaintAll();
  }, [layer, repaintAll]);

  useEffect(() => {
    let cancelled = false;
    pageRefs.current.clear();
    setNumPages(0);
    setLoading(true);
    setError(null);

    async function loadDocument() {
      try {
        const doc = await loadPdfDocument(durableUrl);
        if (cancelled) return;
        setNumPages(doc.numPages);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load PDF');
          setLoading(false);
        }
      }
    }

    void loadDocument();
    return () => {
      cancelled = true;
    };
  }, [durableUrl]);

  useEffect(() => {
    if (numPages === 0) return;

    let cancelled = false;

    async function renderPages(retry = 0) {
      const missing = Array.from({ length: numPages }, (_, i) => i + 1).filter(
        (n) => !pageRefs.current.get(n),
      );
      if (missing.length > 0) {
        if (retry < 20 && !cancelled) {
          window.setTimeout(() => void renderPages(retry + 1), 50);
        }
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const doc = await loadPdfDocument(durableUrl);
        if (cancelled) return;

        const containerWidth = scrollRef.current?.clientWidth || 720;
        const targetWidth = Math.min(Math.max(containerWidth - 24, 320), 900);

        for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
          const refs = pageRefs.current.get(pageNumber);
          if (!refs) continue;

          const page = await doc.getPage(pageNumber);
          const unscaled = page.getViewport({ scale: 1 });
          const scale = targetWidth / unscaled.width;
          const viewport = page.getViewport({ scale });

          refs.wrap.style.width = `${Math.floor(viewport.width)}px`;
          refs.wrap.style.height = `${Math.floor(viewport.height)}px`;

          const pdfCanvas = refs.pdfCanvas;
          pdfCanvas.width = Math.floor(viewport.width);
          pdfCanvas.height = Math.floor(viewport.height);
          pdfCanvas.style.width = `${Math.floor(viewport.width)}px`;
          pdfCanvas.style.height = `${Math.floor(viewport.height)}px`;

          const ctx = pdfCanvas.getContext('2d');
          if (!ctx) continue;
          await page.render({ canvasContext: ctx, viewport }).promise;
          if (cancelled) return;

          paintOverlay(refs.overlayCanvas, layer, pageNumber);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to render PDF');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void renderPages();
    return () => {
      cancelled = true;
    };
  }, [numPages, durableUrl]);

  const registerPageRef = (pageNumber: number, node: HTMLDivElement | null) => {
    if (!node) {
      pageRefs.current.delete(pageNumber);
      return;
    }
    const pdfCanvas = node.querySelector<HTMLCanvasElement>('[data-pdf-page-canvas]');
    const overlayCanvas = node.querySelector<HTMLCanvasElement>('[data-pdf-overlay-canvas]');
    if (!pdfCanvas || !overlayCanvas) return;
    pageRefs.current.set(pageNumber, { wrap: node, pdfCanvas, overlayCanvas });
  };

  const toNormalized = (
    event: React.PointerEvent<HTMLCanvasElement>,
    canvas: HTMLCanvasElement,
  ) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / Math.max(rect.width, 1),
      y: (event.clientY - rect.top) / Math.max(rect.height, 1),
    };
  };

  const handlePointerDown = (
    event: React.PointerEvent<HTMLCanvasElement>,
    pageNumber: number,
  ) => {
    if (readOnly || !drawMode) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    drawingRef.current = true;
    activePageRef.current = pageNumber;
    const p = toNormalized(event, event.currentTarget);
    currentStrokeRef.current = [p.x, p.y];
  };

  const handlePointerMove = (
    event: React.PointerEvent<HTMLCanvasElement>,
    pageNumber: number,
  ) => {
    if (!drawingRef.current || readOnly || !drawMode) return;
    if (activePageRef.current !== pageNumber) return;
    const p = toNormalized(event, event.currentTarget);
    currentStrokeRef.current.push(p.x, p.y);
    const canvas = event.currentTarget;
    const width = canvas.width;
    const height = canvas.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const points = currentStrokeRef.current;
    if (points.length < 4) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(points[points.length - 4] * width, points[points.length - 3] * height);
    ctx.lineTo(points[points.length - 2] * width, points[points.length - 1] * height);
    ctx.stroke();
  };

  const handlePointerUp = (pageNumber: number) => {
    if (!drawingRef.current || readOnly || !drawMode) return;
    drawingRef.current = false;
    const refs = pageRefs.current.get(pageNumber);
    const width = Math.max(refs?.wrap.clientWidth || 1, 1);
    const height = Math.max(refs?.wrap.clientHeight || 1, 1);
    const nextLayer: PdfAnnotationLayer = {
      fileUrl: layer.fileUrl,
      strokes: [
        ...layer.strokes,
        {
          points: [...currentStrokeRef.current],
          color,
          width: lineWidth,
          page: pageNumber,
        },
      ],
      canvasWidth: width,
      canvasHeight: height,
    };
    currentStrokeRef.current = [];
    onLayerChange(nextLayer);
  };

  return (
    <div className="space-y-2">
      {loading && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading PDF…
        </div>
      )}
      {error && (
        <div className="space-y-2">
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
          <iframe
            src={durableUrl}
            title="Submission PDF fallback"
            className="h-[min(60vh,480px)] w-full rounded-lg border bg-white"
          />
          <p className="text-xs text-muted-foreground">
            PDF preview fallback — use Full screen or open the file in a new tab if marking fails to load.
          </p>
          <Button type="button" variant="outline" size="sm" asChild>
            <a href={durableUrl} target="_blank" rel="noopener noreferrer">
              Open PDF in new tab
            </a>
          </Button>
        </div>
      )}
      {!error && (
      <div
        ref={scrollRef}
        className={`overflow-y-auto overflow-x-hidden rounded-lg border bg-muted/20 ${scrollClassName}`}
      >
        <div className="flex flex-col items-center gap-4 p-3">
          {Array.from({ length: numPages }, (_, index) => {
            const pageNumber = index + 1;
            return (
              <div
                key={pageNumber}
                ref={(node) => registerPageRef(pageNumber, node)}
                className="relative shrink-0 rounded-md bg-white shadow-sm ring-1 ring-black/5"
              >
                <span className="absolute right-2 top-2 z-10 rounded bg-black/60 px-2 py-0.5 text-xs text-white">
                  Page {pageNumber}
                  {numPages > 0 ? ` / ${numPages}` : ''}
                </span>
                <canvas data-pdf-page-canvas className="block max-w-full" />
                <canvas
                  data-pdf-overlay-canvas
                  className={`absolute inset-0 h-full w-full ${
                    readOnly || !drawMode
                      ? 'pointer-events-none'
                      : 'cursor-crosshair touch-none'
                  }`}
                  onPointerDown={(e) => handlePointerDown(e, pageNumber)}
                  onPointerMove={(e) => handlePointerMove(e, pageNumber)}
                  onPointerUp={() => handlePointerUp(pageNumber)}
                  onPointerLeave={() => handlePointerUp(pageNumber)}
                />
              </div>
            );
          })}
        </div>
      </div>
      )}
      {!loading && !error && numPages > 0 && (
        <p className="text-xs text-muted-foreground">
          {drawMode
            ? 'Draw mode: mark directly on each page. Switch to Scroll mode to move through pages easily.'
            : 'Scroll mode: scroll to view all pages. Switch to Draw mode to add marks.'}
        </p>
      )}
    </div>
  );
}

function AnnotatorToolbar({
  readOnly,
  drawMode,
  onDrawModeChange,
  color,
  onColorChange,
  lineWidth,
  onLineWidthChange,
  onClear,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  canClear,
  onFullscreen,
  fullscreenLabel = 'Full screen',
}: {
  readOnly: boolean;
  drawMode: boolean;
  onDrawModeChange: (value: boolean) => void;
  color: string;
  onColorChange: (value: string) => void;
  lineWidth: number;
  onLineWidthChange: (value: number) => void;
  onClear: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  canClear: boolean;
  onFullscreen: () => void;
  fullscreenLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {!readOnly && (
        <>
          <Button
            type="button"
            variant={drawMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => onDrawModeChange(true)}
          >
            <Pencil className="mr-1 h-3.5 w-3.5" />
            Draw
          </Button>
          <Button
            type="button"
            variant={!drawMode ? 'default' : 'outline'}
            size="sm"
            onClick={() => onDrawModeChange(false)}
          >
            <Hand className="mr-1 h-3.5 w-3.5" />
            Scroll
          </Button>
          <input
            type="color"
            value={color}
            onChange={(e) => onColorChange(e.target.value)}
            className="h-8 w-10 cursor-pointer rounded border"
            aria-label="Pen color"
            disabled={!drawMode}
          />
          <select
            value={lineWidth}
            onChange={(e) => onLineWidthChange(Number(e.target.value))}
            className="h-8 rounded border px-2 text-sm"
            aria-label="Pen width"
            disabled={!drawMode}
          >
            <option value={2}>Thin</option>
            <option value={3}>Medium</option>
            <option value={5}>Thick</option>
          </select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo"
          >
            <Undo2 className="mr-1 h-3.5 w-3.5" />
            Undo
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo"
          >
            <Redo2 className="mr-1 h-3.5 w-3.5" />
            Redo
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClear}
            disabled={!canClear}
          >
            <Eraser className="mr-1 h-3.5 w-3.5" />
            Clear marks
          </Button>
        </>
      )}
      <Button type="button" variant="outline" size="sm" onClick={onFullscreen}>
        <Expand className="mr-1 h-3.5 w-3.5" />
        {fullscreenLabel}
      </Button>
    </div>
  );
}

export function PdfSubmissionAnnotator({
  pdfUrl,
  value,
  onChange,
  readOnly = false,
  className = '',
}: Props) {
  const [layer, setLayer] = useState<PdfAnnotationLayer>(() => layerForFile(pdfUrl, value));
  const [color, setColor] = useState('#ef4444');
  const [lineWidth, setLineWidth] = useState(3);
  const [drawMode, setDrawMode] = useState(false);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const pastRef = useRef<PdfAnnotationLayer[]>([]);
  const futureRef = useRef<PdfAnnotationLayer[]>([]);
  const [historyTick, setHistoryTick] = useState(0);

  useEffect(() => {
    setLayer(layerForFile(pdfUrl, value));
    pastRef.current = [];
    futureRef.current = [];
    setHistoryTick((tick) => tick + 1);
    // Reset history when switching PDF; avoid resetting on every parent value echo.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only reset when pdfUrl changes
  }, [pdfUrl]);

  const pushHistory = (previous: PdfAnnotationLayer) => {
    pastRef.current = [...pastRef.current, previous];
    futureRef.current = [];
    setHistoryTick((tick) => tick + 1);
  };

  const emitChange = (nextLayer: PdfAnnotationLayer, recordHistory = true) => {
    if (recordHistory) {
      pushHistory(layer);
    }
    setLayer(nextLayer);
    onChange?.({
      layers: [
        ...(value?.layers || []).filter((l) => l.fileUrl !== pdfUrl),
        nextLayer,
      ],
    });
  };

  const clearMarks = () => {
    if (layer.strokes.length === 0) return;
    emitChange({
      fileUrl: pdfUrl,
      strokes: [],
      canvasWidth: layer.canvasWidth,
      canvasHeight: layer.canvasHeight,
    });
  };

  const undo = () => {
    if (pastRef.current.length === 0) return;
    const previous = pastRef.current[pastRef.current.length - 1];
    pastRef.current = pastRef.current.slice(0, -1);
    futureRef.current = [...futureRef.current, layer];
    setLayer(previous);
    onChange?.({
      layers: [
        ...(value?.layers || []).filter((l) => l.fileUrl !== pdfUrl),
        previous,
      ],
    });
    setHistoryTick((tick) => tick + 1);
  };

  const redo = () => {
    if (futureRef.current.length === 0) return;
    const next = futureRef.current[futureRef.current.length - 1];
    futureRef.current = futureRef.current.slice(0, -1);
    pastRef.current = [...pastRef.current, layer];
    setLayer(next);
    onChange?.({
      layers: [
        ...(value?.layers || []).filter((l) => l.fileUrl !== pdfUrl),
        next,
      ],
    });
    setHistoryTick((tick) => tick + 1);
  };

  const canUndo = historyTick >= 0 && pastRef.current.length > 0;
  const canRedo = historyTick >= 0 && futureRef.current.length > 0;

  const viewerProps: ViewerProps = {
    pdfUrl,
    layer,
    drawMode: readOnly ? false : drawMode,
    readOnly,
    color,
    lineWidth,
    onLayerChange: emitChange,
  };

  const toolbarProps = {
    readOnly,
    drawMode,
    onDrawModeChange: setDrawMode,
    color,
    onColorChange: setColor,
    lineWidth,
    onLineWidthChange: setLineWidth,
    onClear: clearMarks,
    onUndo: undo,
    onRedo: redo,
    canUndo,
    canRedo,
    canClear: layer.strokes.length > 0,
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <AnnotatorToolbar
        {...toolbarProps}
        onFullscreen={() => setFullscreenOpen(true)}
      />

      <PdfPagesViewer {...viewerProps} />

      <Dialog open={fullscreenOpen} onOpenChange={setFullscreenOpen}>
        <DialogPortal>
          <DialogOverlay className="z-[100]" />
          <DialogPrimitive.Content
            className={cn(
              'fixed inset-0 z-[100] flex h-svh w-svw max-w-none flex-col gap-3 overflow-hidden border-0 bg-white p-4 shadow-none sm:p-6',
              'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            )}
          >
            <DialogHeader className="shrink-0 text-left">
              <DialogTitle>Submission PDF — full screen</DialogTitle>
            </DialogHeader>
            <AnnotatorToolbar
              {...toolbarProps}
              onFullscreen={() => setFullscreenOpen(false)}
              fullscreenLabel="Exit full screen"
            />
            <div className="min-h-0 flex-1 overflow-hidden">
              <PdfPagesViewer
                {...viewerProps}
                scrollClassName="h-full max-h-full"
              />
            </div>
            <DialogClose className="absolute right-4 top-4 z-10 rounded-full border border-gray-200 bg-white/90 p-2 shadow-lg transition-all duration-200 hover:scale-110 hover:border-gray-300 hover:bg-white hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:scale-95">
              <X className="h-5 w-5 text-gray-600" />
              <span className="sr-only">Close full screen</span>
            </DialogClose>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>
    </div>
  );
}

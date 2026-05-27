"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist";
import {
  ChevronLeft,
  ChevronRight,
  Hand,
  Minus,
  MousePointer2,
  Plus,
  RotateCw,
} from "lucide-react";
import { useAppPreferences } from "./app-preferences";

type Props = {
  url: string;
  converting?: boolean;
};

type LoadError = "load_failed" | "converter_unavailable" | "converter_failed";

const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3] as const;
const DEFAULT_ZOOM_INDEX = 3;

type Rotation = 0 | 90 | 180 | 270;

function normalizeRotation(value: number): Rotation {
  const mod = ((value % 360) + 360) % 360;
  return (mod === 0 || mod === 90 || mod === 180 || mod === 270
    ? mod
    : 0) as Rotation;
}

let workerConfigured = false;

export async function loadPdfjs() {
  const pdfjs = await import("pdfjs-dist");
  if (!workerConfigured) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url,
    ).toString();
    workerConfigured = true;
  }
  return pdfjs;
}

export function PdfViewer({ url, converting = false }: Props) {
  const { t } = useAppPreferences();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pagesContainerRef = useRef<HTMLDivElement | null>(null);
  const pageRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomIndex, setZoomIndex] = useState<number>(DEFAULT_ZOOM_INDEX);
  const [containerWidth, setContainerWidth] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<LoadError | null>(null);
  const [pageRotations, setPageRotations] = useState<Record<number, Rotation>>(
    {},
  );
  const [handMode, setHandMode] = useState(false);
  const [panDragging, setPanDragging] = useState(false);
  const dragPanRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startScrollLeft: number;
    startScrollTop: number;
  } | null>(null);
  const lastCtrlWheelRef = useRef(0);
  const [presenterMode, setPresenterMode] = useState(false);
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [prevUrl, setPrevUrl] = useState(url);

  if (prevUrl !== url) {
    setPrevUrl(url);
    setLoading(true);
    setError(null);
    setDoc(null);
    setPageCount(0);
    setCurrentPage(1);
    setPageRotations({});
    setHandMode(false);
    setPanDragging(false);
    setPresenterMode(false);
    setPointerPos(null);
  }

  const rotatePage = useCallback((pageNumber: number) => {
    setPageRotations((current) => {
      const next = normalizeRotation((current[pageNumber] ?? 0) + 90);
      const updated = { ...current, [pageNumber]: next };
      if (next === 0) delete updated[pageNumber];
      return updated;
    });
  }, []);

  const zoom = ZOOM_LEVELS[zoomIndex];

  useEffect(() => {
    let cancelled = false;
    let task: PDFDocumentLoadingTask | null = null;
    let loaded: PDFDocumentProxy | null = null;

    (async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          let serverError: string | undefined;
          try {
            const payload = (await response.clone().json()) as {
              error?: string;
            };
            serverError = payload?.error;
          } catch {
            // ignore non-json
          }
          if (!cancelled) {
            if (
              response.status === 503 ||
              serverError === "CONVERTER_UNAVAILABLE"
            ) {
              setError("converter_unavailable");
            } else if (
              serverError === "CONVERTER_FAILED" ||
              serverError === "CONVERTER_SPAWN_FAILED" ||
              serverError === "CONVERTER_NO_OUTPUT"
            ) {
              setError("converter_failed");
            } else {
              setError("load_failed");
            }
          }
          return;
        }
        const data = await response.arrayBuffer();
        if (cancelled) return;
        const pdfjs = await loadPdfjs();
        task = pdfjs.getDocument({ data });
        loaded = await task.promise;
        if (cancelled) {
          loaded.destroy();
          return;
        }
        pageRefs.current = new Array(loaded.numPages).fill(null);
        setDoc(loaded);
        setPageCount(loaded.numPages);
      } catch (err) {
        if (!cancelled) {
          console.error("pdf load failed", err);
          setError("load_failed");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      try {
        task?.destroy();
      } catch {
        // ignore
      }
      try {
        loaded?.destroy();
      } catch {
        // ignore
      }
    };
  }, [url]);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => setContainerWidth(el.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || pageCount === 0) return;
    const handler = () => {
      const containerRect = el.getBoundingClientRect();
      const probe = containerRect.top + containerRect.height * 0.3;
      let next = 1;
      let measuredAny = false;
      for (let i = 0; i < pageRefs.current.length; i += 1) {
        const node = pageRefs.current[i];
        if (!node) continue;
        const rect = node.getBoundingClientRect();
        if (rect.height <= 0) continue;
        measuredAny = true;
        if (rect.bottom >= probe) {
          next = i + 1;
          break;
        }
        next = i + 1;
      }
      if (!measuredAny) next = 1;
      setCurrentPage(next);
    };
    handler();
    el.addEventListener("scroll", handler, { passive: true });

    const pagesContainer = pagesContainerRef.current;
    let resizeObserver: ResizeObserver | null = null;
    if (pagesContainer) {
      resizeObserver = new ResizeObserver(() => handler());
      resizeObserver.observe(pagesContainer);
    }

    return () => {
      el.removeEventListener("scroll", handler);
      resizeObserver?.disconnect();
    };
  }, [pageCount]);

  const scrollToPage = useCallback((pageNumber: number) => {
    const target = pageRefs.current[pageNumber - 1];
    const container = scrollRef.current;
    if (!target || !container) return;
    const top =
      target.getBoundingClientRect().top -
      container.getBoundingClientRect().top +
      container.scrollTop -
      12;
    container.scrollTo({ top, behavior: "smooth" });
  }, []);

  const zoomOut = () => setZoomIndex((i) => Math.max(0, i - 1));
  const zoomIn = () =>
    setZoomIndex((i) => Math.min(ZOOM_LEVELS.length - 1, i + 1));
  const resetZoom = () => setZoomIndex(DEFAULT_ZOOM_INDEX);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || loading) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const now = performance.now();
      if (now - lastCtrlWheelRef.current < 110) return;
      lastCtrlWheelRef.current = now;
      if (e.deltaY < 0) {
        setZoomIndex((i) => Math.min(ZOOM_LEVELS.length - 1, i + 1));
      } else if (e.deltaY > 0) {
        setZoomIndex((i) => Math.max(0, i - 1));
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [loading]);

  const handleScrollPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!handMode || loading || !doc) return;
      if (event.button !== 0 && event.pointerType === "mouse") return;
      const target = event.target as HTMLElement;
      if (target.closest("button, a, input, textarea, select")) return;
      const el = scrollRef.current;
      if (!el) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      dragPanRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startScrollLeft: el.scrollLeft,
        startScrollTop: el.scrollTop,
      };
      setPanDragging(true);
    },
    [handMode, loading, doc],
  );

  const handleScrollPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (presenterMode) {
        setPointerPos({ x: event.clientX, y: event.clientY });
      }
      const drag = dragPanRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const el = scrollRef.current;
      if (!el) return;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      el.scrollLeft = drag.startScrollLeft - dx;
      el.scrollTop = drag.startScrollTop - dy;
    },
    [presenterMode],
  );

  const handlePresenterEnter = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!presenterMode) return;
      setPointerPos({ x: event.clientX, y: event.clientY });
    },
    [presenterMode],
  );

  const handlePresenterLeave = useCallback(() => {
    setPointerPos(null);
  }, []);

  const endScrollPan = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const drag = dragPanRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // ignore
      }
      dragPanRef.current = null;
      setPanDragging(false);
    },
    [],
  );

  const canZoomOut = zoomIndex > 0;
  const canZoomIn = zoomIndex < ZOOM_LEVELS.length - 1;

  const pageNumbers = useMemo(
    () => Array.from({ length: pageCount }, (_, i) => i + 1),
    [pageCount],
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-(--ceremony-border) bg-(--ceremony-surface-2) px-4 py-2 text-foreground">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => scrollToPage(Math.max(1, currentPage - 1))}
            disabled={loading || currentPage <= 1}
            className="grid size-9 place-items-center rounded-full border border-(--ceremony-border) bg-(--ceremony-surface) transition hover:border-(--ceremony-primary) hover:text-(--ceremony-primary) disabled:opacity-40"
            aria-label={t("previousPage")}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <div className="flex items-center gap-1 rounded-full border border-(--ceremony-border) bg-(--ceremony-surface) px-2 py-1 text-xs font-bold tabular-nums">
            <input
              type="number"
              min={1}
              max={pageCount || 1}
              value={currentPage}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v) && v >= 1 && v <= pageCount) {
                  scrollToPage(v);
                }
              }}
              disabled={loading || pageCount === 0}
              className="w-10 bg-transparent text-center text-foreground outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              aria-label={t("currentPage")}
            />
            <span className="text-(--ceremony-muted)">/</span>
            <span className="min-w-6 text-center">{pageCount || "—"}</span>
          </div>
          <button
            type="button"
            onClick={() => scrollToPage(Math.min(pageCount, currentPage + 1))}
            disabled={loading || currentPage >= pageCount}
            className="grid size-9 place-items-center rounded-full border border-(--ceremony-border) bg-(--ceremony-surface) transition hover:border-(--ceremony-primary) hover:text-(--ceremony-primary) disabled:opacity-40"
            aria-label={t("nextPage")}
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={zoomOut}
            disabled={loading || !canZoomOut}
            className="grid size-9 place-items-center rounded-full border border-(--ceremony-border) bg-(--ceremony-surface) transition hover:border-(--ceremony-primary) hover:text-(--ceremony-primary) disabled:opacity-40"
            aria-label={t("zoomOut")}
          >
            <Minus className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={resetZoom}
            disabled={loading}
            className="min-h-9 rounded-full border border-(--ceremony-border) bg-(--ceremony-surface) px-3 text-xs font-bold tabular-nums transition hover:border-(--ceremony-primary) hover:text-(--ceremony-primary) disabled:opacity-40"
            aria-label={t("resetZoom")}
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            type="button"
            onClick={zoomIn}
            disabled={loading || !canZoomIn}
            className="grid size-9 place-items-center rounded-full border border-(--ceremony-border) bg-(--ceremony-surface) transition hover:border-(--ceremony-primary) hover:text-(--ceremony-primary) disabled:opacity-40"
            aria-label={t("zoomIn")}
          >
            <Plus className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            role="switch"
            aria-checked={handMode}
            onClick={() => setHandMode((h) => !h)}
            disabled={loading || !doc}
            aria-label={t("pdfHandTool")}
            title={`${t("pdfHandTool")} · ${t("pdfCtrlWheelHint")}`}
            className={`grid size-9 place-items-center rounded-full border text-foreground transition disabled:opacity-40 ${
              handMode
                ? "border-(--ceremony-primary) bg-[color-mix(in_oklab,var(--ceremony-primary)_18%,var(--ceremony-surface))] text-(--ceremony-primary)"
                : "border-(--ceremony-border) bg-(--ceremony-surface) hover:border-(--ceremony-primary) hover:text-(--ceremony-primary)"
            }`}
          >
            <Hand className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            role="switch"
            aria-checked={presenterMode}
            onClick={() => setPresenterMode((p) => !p)}
            disabled={loading || !doc}
            aria-label={t("presenterPointer")}
            title={t("presenterPointer")}
            className={`grid size-9 place-items-center rounded-full border transition disabled:opacity-40 ${
              presenterMode
                ? "border-rose-500 bg-rose-500/15 text-rose-500"
                : "border-(--ceremony-border) bg-(--ceremony-surface) text-foreground hover:border-(--ceremony-primary) hover:text-(--ceremony-primary)"
            }`}
          >
            <MousePointer2 className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        onPointerDown={handleScrollPointerDown}
        onPointerMove={handleScrollPointerMove}
        onPointerEnter={handlePresenterEnter}
        onPointerLeave={handlePresenterLeave}
        onPointerUp={endScrollPan}
        onPointerCancel={endScrollPan}
        className={`relative min-h-0 flex-1 overflow-y-auto overflow-x-auto overscroll-contain bg-background ${
          presenterMode && doc && !loading ? "cursor-none" : ""
        } ${
          handMode && doc && !loading
            ? panDragging
              ? "cursor-grabbing touch-none select-none"
              : "cursor-grab touch-none select-none"
            : ""
        }`}
      >
        {loading ? (
          <div className="grid h-full place-items-center">
            <div className="flex flex-col items-center gap-3 text-(--ceremony-muted)">
              <span className="size-10 animate-spin rounded-full border-2 border-(--ceremony-border) border-t-(--ceremony-primary)" />
              <span className="text-sm font-bold">
                {converting ? t("convertingDocument") : t("loadingPdf")}
              </span>
              {converting ? (
                <span className="max-w-xs text-center text-xs text-(--ceremony-muted)">
                  {t("convertingHint")}
                </span>
              ) : null}
            </div>
          </div>
        ) : error ? (
          <div className="grid h-full place-items-center px-6">
            <p className="max-w-md text-center text-sm font-bold text-(--ceremony-danger)">
              {error === "converter_unavailable"
                ? t("converterUnavailable")
                : error === "converter_failed"
                  ? t("converterFailed")
                  : t("pdfLoadFailed")}
            </p>
          </div>
        ) : doc && containerWidth > 0 ? (
          <div
            ref={pagesContainerRef}
            className="flex flex-col items-center gap-4 px-3 py-4"
          >
            {pageNumbers.map((pageNumber) => {
              const rotation = pageRotations[pageNumber] ?? 0;
              return (
                <PdfPage
                  key={`${pageNumber}-${zoom}-${rotation}`}
                  doc={doc}
                  pageNumber={pageNumber}
                  zoom={zoom}
                  rotation={rotation}
                  rotateLabel={t("rotatePage")}
                  containerWidth={containerWidth}
                  onRotate={() => rotatePage(pageNumber)}
                  registerRef={(node) => {
                    pageRefs.current[pageNumber - 1] = node;
                  }}
                />
              );
            })}
          </div>
        ) : null}
      </div>
      {presenterMode && pointerPos ? (
        <PresenterPointer x={pointerPos.x} y={pointerPos.y} />
      ) : null}
    </div>
  );
}

function PresenterPointer({ x, y }: { x: number; y: number }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed z-80 -translate-x-1/2 -translate-y-1/2"
      style={{ left: x, top: y }}
    >
      <span className="absolute inset-0 -m-3 size-7 animate-ping rounded-full bg-rose-500/40" />
      <span className="relative grid size-5 place-items-center rounded-full bg-rose-500 shadow-[0_0_24px_8px_rgba(244,63,94,0.5)] ring-2 ring-white/70" />
    </div>
  );
}

type PdfPageProps = {
  doc: PDFDocumentProxy;
  pageNumber: number;
  zoom: number;
  rotation: Rotation;
  rotateLabel: string;
  containerWidth: number;
  onRotate: () => void;
  registerRef: (node: HTMLDivElement | null) => void;
};

function PdfPage({
  doc,
  pageNumber,
  zoom,
  rotation,
  rotateLabel,
  containerWidth,
  onRotate,
  registerRef,
}: PdfPageProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dims, setDims] = useState<{ width: number; height: number } | null>(
    null,
  );
  const [rendered, setRendered] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const page = await doc.getPage(pageNumber);
      const totalRotation = normalizeRotation(page.rotate + rotation);
      const baseViewport = page.getViewport({
        scale: 1,
        rotation: totalRotation,
      });
      const horizontalPadding = 24;
      const fitScale = Math.max(
        0.1,
        (containerWidth - horizontalPadding) / baseViewport.width,
      );
      const effective = fitScale * zoom;
      const viewport = page.getViewport({
        scale: effective,
        rotation: totalRotation,
      });
      if (cancelled) return;
      setDims({ width: viewport.width, height: viewport.height });
      setRendered(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [doc, pageNumber, zoom, rotation, containerWidth]);

  const setWrapper = useCallback(
    (node: HTMLDivElement | null) => {
      wrapperRef.current = node;
      registerRef(node);
    },
    [registerRef],
  );

  useEffect(() => {
    const node = wrapperRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin: "300px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [pageNumber]);

  useEffect(() => {
    if (!visible || !dims || !canvasRef.current) return;
    let cancelled = false;
    let task: { cancel: () => void; promise: Promise<void> } | null = null;
    const canvas = canvasRef.current;

    (async () => {
      const page = await doc.getPage(pageNumber);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const totalRotation = normalizeRotation(page.rotate + rotation);
      const baseViewport = page.getViewport({
        scale: 1,
        rotation: totalRotation,
      });
      const horizontalPadding = 24;
      const fitScale = Math.max(
        0.1,
        (containerWidth - horizontalPadding) / baseViewport.width,
      );
      const effective = fitScale * zoom;
      const renderViewport = page.getViewport({
        scale: effective * dpr,
        rotation: totalRotation,
      });
      if (cancelled) return;
      canvas.width = Math.floor(renderViewport.width);
      canvas.height = Math.floor(renderViewport.height);
      canvas.style.width = `${dims.width}px`;
      canvas.style.height = `${dims.height}px`;
      task = page.render({ canvas, viewport: renderViewport });
      try {
        await task.promise;
        if (!cancelled) setRendered(true);
      } catch {
        // cancelled
      }
    })();

    return () => {
      cancelled = true;
      try {
        task?.cancel();
      } catch {
        // ignore
      }
    };
  }, [visible, dims, doc, pageNumber, zoom, rotation, containerWidth]);

  return (
    <div
      ref={setWrapper}
      style={dims ? { width: dims.width, height: dims.height } : undefined}
      className="group/page relative bg-white shadow-[0_8px_24px_-12px_oklch(0_0_0/0.6)]"
      data-page={pageNumber}
      data-rotation={rotation}
    >
      <canvas ref={canvasRef} className="block" />
      {!rendered ? (
        <div className="absolute inset-0 grid place-items-center text-xs font-bold text-[oklch(0.4_0.02_255)]">
          {pageNumber}
        </div>
      ) : null}
      <div className="pointer-events-none absolute right-2 top-2 flex items-center gap-1.5 opacity-0 transition-opacity group-hover/page:opacity-100 group-focus-within/page:opacity-100">
        <span className="pointer-events-auto rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold tabular-nums text-white shadow">
          {pageNumber}
        </span>
        <button
          type="button"
          onClick={onRotate}
          className="pointer-events-auto grid size-8 place-items-center rounded-full bg-black/60 text-white shadow-md backdrop-blur transition hover:bg-black/80"
          aria-label={`${rotateLabel} ${pageNumber}`}
          title={`${rotateLabel} ${pageNumber}`}
        >
          <RotateCw className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

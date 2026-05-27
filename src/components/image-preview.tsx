"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Maximize, Minus, MousePointer2, Plus, RotateCw } from "lucide-react";
import { useAppPreferences } from "./app-preferences";

type Props = {
  url: string;
  alt: string;
};

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 8;
const DEFAULT_ZOOM = 1;
const BUTTON_STEP = 1.25;
const WHEEL_INTENSITY = 0.0015;

type Rotation = 0 | 90 | 180 | 270;

function normalizeRotation(value: number): Rotation {
  const mod = ((value % 360) + 360) % 360;
  return (mod === 0 || mod === 90 || mod === 180 || mod === 270
    ? mod
    : 0) as Rotation;
}

function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

export function ImagePreview({ url, alt }: Props) {
  const { t } = useAppPreferences();
  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<
    | {
        pointerId: number;
        startX: number;
        startY: number;
        startPanX: number;
        startPanY: number;
      }
    | null
  >(null);

  const [zoom, setZoom] = useState<number>(DEFAULT_ZOOM);
  const [rotation, setRotation] = useState<Rotation>(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [presenterMode, setPresenterMode] = useState(false);
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [prevUrl, setPrevUrl] = useState(url);

  if (prevUrl !== url) {
    setPrevUrl(url);
    setZoom(DEFAULT_ZOOM);
    setRotation(0);
    setPan({ x: 0, y: 0 });
    setStatus("loading");
  }

  const zoomRef = useRef(zoom);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  const canZoomIn = zoom < MAX_ZOOM - 0.001;
  const canZoomOut = zoom > MIN_ZOOM + 0.001;

  const applyZoomAroundCenter = useCallback((factor: number) => {
    const oldZoom = zoomRef.current;
    const newZoom = clampZoom(oldZoom * factor);
    const realFactor = newZoom / oldZoom;
    setZoom(newZoom);
    setPan((p) => ({ x: p.x * realFactor, y: p.y * realFactor }));
  }, []);

  const zoomIn = () => applyZoomAroundCenter(BUTTON_STEP);
  const zoomOut = () => applyZoomAroundCenter(1 / BUTTON_STEP);

  const resetView = useCallback(() => {
    setZoom(DEFAULT_ZOOM);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  }, []);

  const rotate = () => setRotation((r) => normalizeRotation(r + 90));

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const factor = Math.exp(-event.deltaY * WHEEL_INTENSITY);
      const oldZoom = zoomRef.current;
      const newZoom = clampZoom(oldZoom * factor);
      const realFactor = newZoom / oldZoom;
      if (realFactor === 1) return;

      const rect = el.getBoundingClientRect();
      const cx = event.clientX - rect.left - rect.width / 2;
      const cy = event.clientY - rect.top - rect.height / 2;

      setZoom(newZoom);
      setPan((p) => ({
        x: cx - (cx - p.x) * realFactor,
        y: cy - (cy - p.y) * realFactor,
      }));
    };
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startPanX: pan.x,
      startPanY: pan.y,
    };
    setDragging(true);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (presenterMode) {
      setPointerPos({ x: event.clientX, y: event.clientY });
    }
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    setPan({ x: drag.startPanX + dx, y: drag.startPanY + dy });
  };

  const handlePointerEnter = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!presenterMode) return;
    setPointerPos({ x: event.clientX, y: event.clientY });
  };

  const handlePointerLeave = () => {
    setPointerPos(null);
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // ignore
    }
    dragRef.current = null;
    setDragging(false);
  };

  const handleDoubleClick = () => {
    if (zoomRef.current === DEFAULT_ZOOM) {
      applyZoomAroundCenter(2);
    } else {
      resetView();
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center justify-end gap-1.5 border-b border-(--ceremony-border) bg-(--ceremony-surface-2) px-4 py-2 text-foreground">
        <button
          type="button"
          onClick={zoomOut}
          disabled={!canZoomOut}
          className="grid size-9 place-items-center rounded-full border border-(--ceremony-border) bg-(--ceremony-surface) transition hover:border-(--ceremony-primary) hover:text-(--ceremony-primary) disabled:opacity-40"
          aria-label={t("zoomOut")}
        >
          <Minus className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={resetView}
          className="min-h-9 rounded-full border border-(--ceremony-border) bg-(--ceremony-surface) px-3 text-xs font-bold tabular-nums transition hover:border-(--ceremony-primary) hover:text-(--ceremony-primary)"
          aria-label={t("resetZoom")}
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          type="button"
          onClick={zoomIn}
          disabled={!canZoomIn}
          className="grid size-9 place-items-center rounded-full border border-(--ceremony-border) bg-(--ceremony-surface) transition hover:border-(--ceremony-primary) hover:text-(--ceremony-primary) disabled:opacity-40"
          aria-label={t("zoomIn")}
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={rotate}
          className="grid size-9 place-items-center rounded-full border border-(--ceremony-border) bg-(--ceremony-surface) transition hover:border-(--ceremony-primary) hover:text-(--ceremony-primary)"
          aria-label={t("rotatePage")}
          title={t("rotatePage")}
        >
          <RotateCw className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={resetView}
          disabled={status !== "ready"}
          className="grid size-9 place-items-center rounded-full border border-(--ceremony-border) bg-(--ceremony-surface) transition hover:border-(--ceremony-primary) hover:text-(--ceremony-primary) disabled:pointer-events-none disabled:opacity-40"
          aria-label={t("resetView")}
          title={t("resetView")}
        >
          <Maximize className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          role="switch"
          aria-checked={presenterMode}
          onClick={() => setPresenterMode((p) => !p)}
          disabled={status !== "ready"}
          aria-label={t("presenterPointer")}
          title={t("presenterPointer")}
          className={`grid size-9 place-items-center rounded-full border transition disabled:pointer-events-none disabled:opacity-40 ${
            presenterMode
              ? "border-rose-500 bg-rose-500/15 text-rose-500"
              : "border-(--ceremony-border) bg-(--ceremony-surface) text-foreground hover:border-(--ceremony-primary) hover:text-(--ceremony-primary)"
          }`}
        >
          <MousePointer2 className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div
        ref={stageRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDoubleClick={handleDoubleClick}
        className={`relative min-h-0 flex-1 touch-none select-none overflow-hidden overscroll-contain bg-background ${
          presenterMode && status === "ready"
            ? "cursor-none"
            : status === "ready"
              ? dragging
                ? "cursor-grabbing"
                : "cursor-grab"
              : "cursor-default"
        }`}
      >
        {status === "error" ? (
          <div className="grid h-full place-items-center px-6">
            <p className="text-sm font-bold text-(--ceremony-danger)">
              {t("imageLoadFailed")}
            </p>
          </div>
        ) : (
          <>
            {status === "loading" ? (
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <div className="flex flex-col items-center gap-3 text-(--ceremony-muted)">
                  <span className="size-10 animate-spin rounded-full border-2 border-(--ceremony-border) border-t-(--ceremony-primary)" />
                  <span className="text-sm font-bold">
                    {t("loadingImage")}
                  </span>
                </div>
              </div>
            ) : null}
            <div className="absolute inset-0 grid place-items-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- transform-based viewer needs raw <img> */}
              <img
                src={url}
                alt={alt}
                onLoad={() => setStatus("ready")}
                onError={() => setStatus("error")}
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${zoom})`,
                  transformOrigin: "center center",
                }}
                className={`max-h-[80vh] max-w-[90%] object-contain shadow-[0_8px_24px_-12px_oklch(0_0_0/0.6)] ${
                  status === "ready" ? "opacity-100" : "opacity-0"
                }`}
                draggable={false}
              />
            </div>
          </>
        )}
      </div>
      {presenterMode && pointerPos ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-80 -translate-x-1/2 -translate-y-1/2"
          style={{ left: pointerPos.x, top: pointerPos.y }}
        >
          <span className="absolute inset-0 -m-3 size-7 animate-ping rounded-full bg-rose-500/40" />
          <span className="relative grid size-5 place-items-center rounded-full bg-rose-500 shadow-[0_0_24px_8px_rgba(244,63,94,0.5)] ring-2 ring-white/70" />
        </div>
      ) : null}
    </div>
  );
}

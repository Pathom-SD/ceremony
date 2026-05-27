"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Maximize, Minimize, Pause, Play, Volume2, VolumeX, X } from "lucide-react";
import type { StoredFileRecord } from "@/lib/file-types";
import { useAppPreferences } from "./app-preferences";

const SEEK_STEP_SEC = 10;
const CONTROLS_HIDE_MS = 3000;

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${m}:${pad(s)}`;
}

type Props = {
  file: StoredFileRecord;
  src: string;
  onClose: () => void;
};

export function CeremonyVideoPlayer({ file, src, onClose }: Props) {
  const { t } = useAppPreferences();
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const volumeBeforeMuteRef = useRef(1);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  const revealControls = useCallback(
    (autoHide: boolean, forcePlaying?: boolean) => {
      setShowControls(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      const shouldHide = forcePlaying ?? playing;
      if (autoHide && shouldHide) {
        hideTimerRef.current = setTimeout(() => setShowControls(false), CONTROLS_HIDE_MS);
      }
    },
    [playing],
  );

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
    } else {
      video.pause();
    }
  }, []);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.muted || video.volume === 0) {
      const restored = volumeBeforeMuteRef.current > 0 ? volumeBeforeMuteRef.current : 1;
      video.muted = false;
      video.volume = restored;
      setMuted(false);
      setVolume(restored);
    } else {
      volumeBeforeMuteRef.current = video.volume;
      video.muted = true;
      setMuted(true);
    }
  }, []);

  const seekBy = useCallback(
    (delta: number) => {
      const video = videoRef.current;
      if (!video || !Number.isFinite(video.duration)) return;
      video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + delta));
      revealControls(!video.paused);
    },
    [revealControls],
  );

  const toggleFullscreen = useCallback(async () => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch {
      /* unsupported */
    }
  }, []);

  const handleClose = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    }
    onClose();
  }, [onClose]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    void video.play().catch(() => {
      /* autoplay blocked — user can press play */
    });
  }, [src]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = volume;
    if (!muted) video.muted = false;
  }, [volume, muted]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        return;
      }

      if (e.key === "Escape") {
        if (document.fullscreenElement) {
          void document.exitFullscreen();
          return;
        }
        handleClose();
        return;
      }

      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        togglePlay();
        return;
      }

      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        void toggleFullscreen();
        return;
      }

      if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        toggleMute();
        return;
      }

      if (e.key === "ArrowLeft") {
        e.preventDefault();
        seekBy(-SEEK_STEP_SEC);
        return;
      }

      if (e.key === "ArrowRight") {
        e.preventDefault();
        seekBy(SEEK_STEP_SEC);
      }
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [handleClose, seekBy, toggleFullscreen, toggleMute, togglePlay]);

  const onSeekInput = (value: number) => {
    const video = videoRef.current;
    if (!video || !Number.isFinite(video.duration)) return;
    video.currentTime = value;
    setCurrentTime(value);
    revealControls(!video.paused);
  };

  const onVolumeInput = (value: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = value;
    video.muted = value === 0;
    setVolume(value);
    setMuted(value === 0);
    if (value > 0) volumeBeforeMuteRef.current = value;
  };

  const controlsVisible = !playing || showControls;

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center p-4 sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={t("videoPlayer")}
    >
      <button
        type="button"
        data-video-player-backdrop
        className="absolute inset-0 bg-[oklch(0.08_0.02_255/0.82)] backdrop-blur-[3px]"
        aria-label={t("close")}
        onClick={handleClose}
      />

      <div
        ref={containerRef}
        data-video-player-shell
        className={`relative z-10 flex flex-col overflow-hidden bg-black ${
          isFullscreen
            ? "h-screen w-screen max-w-none rounded-none border-0 shadow-none"
            : "w-full max-w-[min(92vw,72rem)] rounded-[8px] border border-[oklch(1_0_0/0.12)] shadow-[0_28px_80px_-24px_oklch(0_0_0/0.75)]"
        }`}
        onClick={(e) => e.stopPropagation()}
        onMouseMove={() => revealControls(true, true)}
        onMouseLeave={() => {
          if (playing) revealControls(true, true);
        }}
      >
        <div className="group relative flex min-h-0 flex-col bg-black">
          <video
            ref={videoRef}
            key={src}
            src={src}
            className={`w-full bg-black object-contain ${isFullscreen ? "h-full max-h-none" : "max-h-[min(78vh,calc(92vw*9/16))]"}`}
            playsInline
            preload="auto"
            onClick={togglePlay}
            onPlay={() => {
              setPlaying(true);
              revealControls(true, true);
            }}
            onPause={() => {
              setPlaying(false);
              setShowControls(true);
              if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
            }}
            onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
            onLoadStart={() => {
              setVideoReady(false);
              setLoadError(false);
            }}
            onLoadedMetadata={() => {
              setDuration(videoRef.current?.duration ?? 0);
            }}
            onCanPlay={() => setVideoReady(true)}
            onError={() => {
              setLoadError(true);
              setVideoReady(false);
            }}
          />

          {!videoReady && !loadError ? (
            <div
              data-video-player-loading
              className="pointer-events-none absolute inset-0 grid place-items-center bg-black"
              role="status"
              aria-live="polite"
            >
              <div className="flex flex-col items-center gap-3 text-white/85">
                <span className="size-10 animate-spin rounded-full border-2 border-white/25 border-t-white" />
                <span className="text-sm font-bold">{t("loadingVideo")}</span>
              </div>
            </div>
          ) : null}

          {loadError ? (
            <p className="absolute inset-x-0 top-1/2 -translate-y-1/2 px-6 text-center text-sm font-semibold text-white/90">
              {t("videoPlayError")}
            </p>
          ) : null}

          <div
            data-video-player-controls
            className={`pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-[oklch(0_0_0/0.88)] via-[oklch(0_0_0/0.45)] to-transparent px-4 pb-4 pt-16 transition-opacity duration-300 ${
              controlsVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            <div className="pointer-events-auto space-y-3">
              <p className="truncate pr-2 text-sm font-bold text-white drop-shadow-sm">{file.originalName}</p>

              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={0.1}
                  value={Math.min(currentTime, duration || 0)}
                  onChange={(e) => onSeekInput(Number(e.target.value))}
                  className="video-seek h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-[oklch(1_0_0/0.25)] accent-(--ceremony-primary)"
                  aria-label={t("videoSeek")}
                  aria-valuemin={0}
                  aria-valuemax={duration}
                  aria-valuenow={currentTime}
                />
                <span className="shrink-0 tabular-nums text-[11px] font-bold text-white/85">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="grid size-10 place-items-center rounded-full bg-white/15 text-white backdrop-blur-sm transition hover:bg-white/25"
                  aria-label={playing ? t("videoPause") : t("videoPlayAction")}
                >
                  {playing ? (
                    <Pause className="size-5" fill="currentColor" />
                  ) : (
                    <Play className="size-5 translate-x-0.5" fill="currentColor" />
                  )}
                </button>

                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="grid size-10 shrink-0 place-items-center rounded-full text-white/90 transition hover:bg-white/15"
                    aria-label={muted || volume === 0 ? t("videoUnmute") : t("videoMute")}
                  >
                    {muted || volume === 0 ? (
                      <VolumeX className="size-5" strokeWidth={2.25} />
                    ) : (
                      <Volume2 className="size-5" strokeWidth={2.25} />
                    )}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={muted ? 0 : volume}
                    onChange={(e) => onVolumeInput(Number(e.target.value))}
                    className="video-volume hidden h-1.5 w-24 max-w-[6rem] cursor-pointer appearance-none rounded-full bg-[oklch(1_0_0/0.25)] accent-(--ceremony-primary) sm:block"
                    aria-label={t("videoVolume")}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => void toggleFullscreen()}
                  className="grid size-10 place-items-center rounded-full text-white/90 transition hover:bg-white/15"
                  aria-label={isFullscreen ? t("videoExitFullscreen") : t("videoFullscreen")}
                >
                  {isFullscreen ? (
                    <Minimize className="size-5" strokeWidth={2.25} />
                  ) : (
                    <Maximize className="size-5" strokeWidth={2.25} />
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleClose}
                  className="grid size-10 place-items-center rounded-full bg-white/15 text-white transition hover:bg-white/25"
                  aria-label={t("close")}
                >
                  <X className="size-5" strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>

          {!playing && !loadError && videoReady ? (
            <button
              type="button"
              onClick={togglePlay}
              className={`pointer-events-auto absolute inset-0 grid place-items-center transition-opacity duration-300 ${
                controlsVisible ? "opacity-100" : "opacity-0"
              }`}
              aria-label={t("videoPlayAction")}
            >
              <span className="grid size-16 place-items-center rounded-full bg-[oklch(0_0_0/0.45)] text-white ring-2 ring-white/30 backdrop-blur-sm transition hover:scale-105 hover:bg-[oklch(0_0_0/0.55)]">
                <Play className="size-8 translate-x-0.5" fill="currentColor" />
              </span>
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import type { StoredFileRecord } from "@/lib/file-types";
import { canPreviewAsPdf, isImageExt } from "@/lib/file-types";
import {
  File as FileGlyph,
  FileSpreadsheet,
  FileText,
  FileType,
  FileX2,
  ImageOff,
  MoreVertical,
  Presentation,
  Trash2,
} from "lucide-react";
import { useAppPreferences } from "./app-preferences";
import { loadPdfjs } from "./pdf-viewer";

type Props = {
  file: StoredFileRecord;
  onPreview: () => void;
  onRemove: () => void;
};

type FileKind =
  | "pdf"
  | "doc"
  | "sheet"
  | "slide"
  | "text"
  | "image"
  | "other";

function getKind(ext: string): FileKind {
  const lower = ext.toLowerCase();
  if (lower === ".pdf") return "pdf";
  if ([".doc", ".docx", ".odt", ".rtf"].includes(lower)) return "doc";
  if ([".xls", ".xlsx", ".ods", ".csv"].includes(lower)) return "sheet";
  if ([".ppt", ".pptx", ".odp"].includes(lower)) return "slide";
  if (lower === ".txt") return "text";
  if (isImageExt(lower)) return "image";
  return "other";
}

function getLabel(ext: string): string {
  return ext.replace(".", "").toUpperCase();
}

const kindPalette: Record<
  FileKind,
  { tagBg: string; tagFg: string; coverBg: string; iconFg: string }
> = {
  pdf: {
    tagBg: "oklch(0.95 0.06 27)",
    tagFg: "oklch(0.42 0.18 27)",
    coverBg: "oklch(0.97 0.025 27)",
    iconFg: "oklch(0.55 0.18 27)",
  },
  doc: {
    tagBg: "oklch(0.95 0.05 245)",
    tagFg: "oklch(0.4 0.16 245)",
    coverBg: "oklch(0.97 0.02 245)",
    iconFg: "oklch(0.52 0.16 245)",
  },
  sheet: {
    tagBg: "oklch(0.95 0.07 150)",
    tagFg: "oklch(0.4 0.13 150)",
    coverBg: "oklch(0.97 0.03 150)",
    iconFg: "oklch(0.52 0.14 150)",
  },
  slide: {
    tagBg: "oklch(0.95 0.06 50)",
    tagFg: "oklch(0.46 0.16 50)",
    coverBg: "oklch(0.97 0.03 50)",
    iconFg: "oklch(0.6 0.16 50)",
  },
  text: {
    tagBg: "oklch(0.94 0.02 250)",
    tagFg: "oklch(0.4 0.04 250)",
    coverBg: "oklch(0.97 0.01 250)",
    iconFg: "oklch(0.5 0.04 250)",
  },
  image: {
    tagBg: "oklch(0.95 0.06 275)",
    tagFg: "oklch(0.42 0.18 275)",
    coverBg: "oklch(0.96 0.025 275)",
    iconFg: "oklch(0.55 0.18 275)",
  },
  other: {
    tagBg: "var(--ceremony-surface-2)",
    tagFg: "var(--ceremony-muted)",
    coverBg: "var(--ceremony-surface-2)",
    iconFg: "var(--ceremony-muted)",
  },
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatUploadedAt(value: string): string {
  const date = new Date(value);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

export function FileCard({ file, onPreview, onRemove }: Props) {
  const { t } = useAppPreferences();
  const kind = getKind(file.ext);
  const palette = kindPalette[kind];
  const label = getLabel(file.ext);
  const previewableAsPdf = canPreviewAsPdf(file.ext);
  const isImage = kind === "image";
  const pdfUrl =
    file.ext.toLowerCase() === ".pdf"
      ? `/api/files/${file.id}?preview=1`
      : `/api/files/${file.id}/pdf`;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (event: globalThis.MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [menuOpen]);

  const stop = (event: MouseEvent) => {
    event.stopPropagation();
  };

  return (
    <article className="group/card flex flex-col overflow-hidden rounded-2xl border border-(--ceremony-border) bg-(--ceremony-surface) transition hover:-translate-y-0.5 hover:border-(--ceremony-primary) hover:shadow-lg">
      <button
        type="button"
        onClick={onPreview}
        className="relative aspect-4/3 w-full overflow-hidden text-left"
        style={{ backgroundColor: palette.coverBg }}
        aria-label={`${t("fullScreenPreview")}: ${file.originalName}`}
      >
        <span
          className="absolute left-2 top-2 z-10 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.12em]"
          style={{ backgroundColor: palette.tagBg, color: palette.tagFg }}
        >
          {label}
        </span>

        {previewableAsPdf ? (
          <PdfThumbnail url={pdfUrl} accent={palette.iconFg} />
        ) : isImage ? (
          <ImageThumbnail
            fileId={file.id}
            alt={file.originalName}
            accent={palette.iconFg}
          />
        ) : (
          <div
            className="grid h-full w-full place-items-center"
            style={{ color: palette.iconFg }}
          >
            <FileIcon kind={kind} />
          </div>
        )}
      </button>

      <div className="flex flex-1 items-start gap-2 p-3">
        <div className="min-w-0 flex-1">
          <p
            className="line-clamp-2 wrap-break-word text-sm font-bold text-foreground"
            title={file.originalName}
          >
            {file.originalName}
          </p>
          <p className="mt-1 text-[11px] font-medium tabular-nums text-(--ceremony-muted)">
            {formatBytes(file.size)} · {formatUploadedAt(file.uploadedAt)}
          </p>
        </div>

        <div ref={menuRef} className="relative shrink-0" onClick={stop}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={t("moreActions")}
            className="grid size-8 place-items-center rounded-full text-(--ceremony-muted) transition hover:bg-(--ceremony-surface-2) hover:text-foreground aria-expanded:bg-(--ceremony-surface-2) aria-expanded:text-foreground"
          >
            <MoreVertical className="size-5" aria-hidden="true" />
          </button>

          {menuOpen ? (
            <div
              role="menu"
              className="absolute right-0 top-9 z-20 min-w-[140px] overflow-hidden rounded-xl border border-(--ceremony-border) bg-(--ceremony-surface) py-1 shadow-xl"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onRemove();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-bold text-(--ceremony-danger) transition hover:bg-(--ceremony-danger-soft)"
              >
                <Trash2 className="size-4" aria-hidden="true" />
                {t("remove")}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function FileIcon({ kind }: { kind: FileKind }) {
  const Icon =
    kind === "pdf"
      ? FileText
      : kind === "doc"
        ? FileType
        : kind === "sheet"
          ? FileSpreadsheet
          : kind === "slide"
            ? Presentation
            : kind === "text"
              ? FileText
              : FileGlyph;
  return <Icon className="size-14" strokeWidth={1.5} aria-hidden="true" />;
}

function PdfThumbnail({ url, accent }: { url: string; accent: string }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const [visible, setVisible] = useState(false);

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
      { rootMargin: "200px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !canvasRef.current) return;
    const canvas = canvasRef.current;
    let cancelled = false;
    let task: { cancel: () => void; promise: Promise<void> } | null = null;
    let doc: { destroy: () => Promise<void> } | null = null;

    setStatus("loading");
    (async () => {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.arrayBuffer();
        if (cancelled) return;
        const pdfjs = await loadPdfjs();
        const loadingTask = pdfjs.getDocument({ data });
        const pdf = await loadingTask.promise;
        doc = pdf;
        if (cancelled) {
          await pdf.destroy();
          return;
        }
        const page = await pdf.getPage(1);
        const baseViewport = page.getViewport({ scale: 1 });
        const targetWidth = canvas.parentElement?.clientWidth ?? 320;
        const scale = Math.max(0.1, targetWidth / baseViewport.width);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale: scale * dpr });
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        task = page.render({ canvas, viewport });
        await task.promise;
        if (!cancelled) setStatus("ready");
      } catch (err) {
        if (!cancelled) {
          console.error("pdf thumbnail failed", err);
          setStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
      try {
        task?.cancel();
      } catch {
        // ignore
      }
      void doc?.destroy().catch(() => {});
    };
  }, [url, visible]);

  return (
    <div ref={wrapperRef} className="absolute inset-0">
      <canvas
        ref={canvasRef}
        className="block h-full w-full object-cover"
        aria-hidden="true"
      />
      {status !== "ready" ? (
        <div className="absolute inset-0 grid place-items-center">
          {status === "error" ? (
            <FileX2
              className="size-10"
              style={{ color: accent }}
              strokeWidth={1.75}
              aria-hidden="true"
            />
          ) : (
            <span
              className="size-7 animate-spin rounded-full border-2 border-t-transparent"
              style={{ borderColor: accent, borderTopColor: "transparent" }}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}

function ImageThumbnail({
  fileId,
  alt,
  accent,
}: {
  fileId: string;
  alt: string;
  accent: string;
}) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const url = `/api/files/${fileId}?preview=1`;

  return (
    <div className="absolute inset-0">
      {/* eslint-disable-next-line @next/next/no-img-element -- served from local API, no remote optimization needed */}
      <img
        src={url}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setStatus("ready")}
        onError={() => setStatus("error")}
        className={`block h-full w-full object-contain transition-opacity ${
          status === "ready" ? "opacity-100" : "opacity-0"
        }`}
      />
      {status !== "ready" ? (
        <div className="absolute inset-0 grid place-items-center">
          {status === "error" ? (
            <ImageOff
              className="size-10"
              style={{ color: accent }}
              strokeWidth={1.75}
              aria-hidden="true"
            />
          ) : (
            <span
              className="size-7 animate-spin rounded-full border-2 border-t-transparent"
              style={{ borderColor: accent, borderTopColor: "transparent" }}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}

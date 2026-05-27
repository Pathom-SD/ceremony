"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, Minimize2, MoreVertical, Play, Upload, X } from "lucide-react";
import type { StoredFileRecord } from "@/lib/file-types";
import { isVideoExt, VIDEO_EXTENSIONS } from "@/lib/file-types";
import { CeremonyVideoPlayer } from "./ceremony-video-player";
import { useAppPreferences } from "./app-preferences";

const VIDEO_ACCEPT = [
  ...VIDEO_EXTENSIONS,
  "video/*",
  "video/mp4",
  "video/webm",
  "video/quicktime",
].join(",");

type MenuState = { left: number; top: number; file: StoredFileRecord };

type UploadProgressState = {
  percent: number;
  fileIndex: number;
  totalFiles: number;
  fileName: string;
};

function postFormUploadWithProgress(
  url: string,
  formData: FormData,
  onUploadProgress: (loaded: number, total: number, lengthComputable: boolean) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (ev) => {
      onUploadProgress(ev.loaded, ev.total, ev.lengthComputable);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      try {
        const j = JSON.parse(xhr.responseText) as { error?: string };
        reject(new Error(j.error ?? "UPLOAD_FAILED"));
      } catch {
        reject(new Error("UPLOAD_FAILED"));
      }
    };
    xhr.onerror = () => reject(new Error("UPLOAD_FAILED"));
    xhr.send(formData);
  });
}

type Props = {
  topicId: string;
  files: StoredFileRecord[];
  onRefresh: () => void;
};

export function VideoLibraryMini({ topicId, files, onRefresh }: Props) {
  const { t } = useAppPreferences();
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [libraryExpanded, setLibraryExpanded] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [playingFile, setPlayingFile] = useState<StoredFileRecord | null>(null);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [renameTarget, setRenameTarget] = useState<StoredFileRecord | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgressState | null>(null);

  const videos = useMemo(
    () =>
      [...files.filter((f) => isVideoExt(f.ext))].sort((a, b) =>
        a.uploadedAt < b.uploadedAt ? 1 : -1,
      ),
    [files],
  );

  const toggleLibraryExpanded = useCallback(() => {
    setLibraryExpanded((e) => !e);
  }, []);

  const closePanel = useCallback(() => {
    setLibraryExpanded(false);
    setPanelOpen(false);
    setPlayingFile(null);
    setMenu(null);
    setError(null);
  }, []);

  const togglePanel = useCallback(() => {
    setPanelOpen((o) => {
      const next = !o;
      if (next) void onRefresh();
      if (!next) {
        setLibraryExpanded(false);
        setPlayingFile(null);
        setMenu(null);
      }
      return next;
    });
    setError(null);
  }, [onRefresh]);

  useEffect(() => {
    if (!menu) return;
    const onDoc = (e: MouseEvent) => {
      const el = e.target;
      if (!(el instanceof Node)) return;
      if (panelRef.current?.contains(el)) return;
      if (menuRef.current?.contains(el)) return;
      setMenu(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menu]);

  const activePlayingFile =
    playingFile && videos.some((v) => v.id === playingFile.id) ? playingFile : null;

  const upload = async (list: FileList | null) => {
    if (!list?.length) return;
    const fileArr = Array.from(list);
    const totalBytes = Math.max(1, fileArr.reduce((s, f) => s + f.size, 0));
    setBusy(true);
    setError(null);
    setUploadProgress({
      percent: 0,
      fileIndex: 0,
      totalFiles: fileArr.length,
      fileName: fileArr[0]?.name ?? "",
    });
    try {
      let completedBytes = 0;
      for (let i = 0; i < fileArr.length; i++) {
        const file = fileArr[i];
        setUploadProgress((p) =>
          p
            ? {
                ...p,
                fileIndex: i,
                fileName: file.name,
                percent: Math.min(99, Math.round((completedBytes / totalBytes) * 100)),
              }
            : null,
        );
        const fd = new FormData();
        fd.set("file", file);
        await postFormUploadWithProgress(`/api/topics/${topicId}/files`, fd, (loaded, total, computable) => {
          let pct: number;
          if (computable && total > 0) {
            pct = Math.min(99, Math.round(((completedBytes + loaded) / totalBytes) * 100));
          } else {
            const slice = 100 / fileArr.length;
            pct = Math.min(99, Math.round(i * slice + slice * 0.5));
          }
          setUploadProgress((p) =>
            p
              ? {
                  ...p,
                  fileIndex: i,
                  fileName: file.name,
                  percent: pct,
                }
              : null,
          );
        });
        completedBytes += file.size;
      }
      setUploadProgress((p) => (p ? { ...p, percent: 100 } : null));
      onRefresh();
    } catch (e) {
      setError(
        e instanceof Error && e.message === "INVALID_EXTENSION"
          ? t("uploadInvalidVideo")
          : t("uploadFailed"),
      );
    } finally {
      setBusy(false);
      setUploadProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeVideo = async (file: StoredFileRecord) => {
    if (!window.confirm(t("confirmDeleteVideo"))) return;
    setMenu(null);
    setError(null);
    const res = await fetch(`/api/topics/${topicId}/files/${file.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setError(t("removeFailed"));
      return;
    }
    if (playingFile?.id === file.id) setPlayingFile(null);
    onRefresh();
  };

  const openRename = (file: StoredFileRecord) => {
    setMenu(null);
    setRenameTarget(file);
    setRenameDraft(file.originalName.replace(new RegExp(`${file.ext}$`, "i"), ""));
  };

  const saveRename = async () => {
    if (!renameTarget) return;
    const name = renameDraft.trim();
    if (!name) return;
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/topics/${topicId}/files/${renameTarget.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ originalName: name }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(t("renameFailed"));
      return;
    }
    setRenameTarget(null);
    onRefresh();
  };

  const openMenu = (e: React.MouseEvent, file: StoredFileRecord) => {
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    const menuWidth = 148;
    setMenu({
      file,
      left: Math.max(8, Math.min(r.right - menuWidth, window.innerWidth - menuWidth - 8)),
      top: Math.min(r.bottom + 4, window.innerHeight - 120),
    });
  };

  const selectVideo = (file: StoredFileRecord) => {
    setMenu(null);
    setError(null);
    setPlayingFile(file);
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={VIDEO_ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => void upload(e.target.files)}
      />

      {activePlayingFile ? (
        <CeremonyVideoPlayer
          file={activePlayingFile}
          src={`/api/files/${activePlayingFile.id}?preview=1`}
          onClose={() => setPlayingFile(null)}
        />
      ) : null}

      {panelOpen ? (
        <div
          ref={panelRef}
          className={
            libraryExpanded
              ? "fixed inset-0 z-[90] flex h-full w-full min-h-0 flex-col overflow-hidden border border-(--ceremony-border) bg-(--ceremony-surface) shadow-[0_22px_50px_-20px_oklch(0.2_0.05_255/0.55)]"
              : "fixed bottom-[4.75rem] right-4 z-[90] flex w-[min(calc(100vw-2rem),380px)] max-h-[min(52vh,440px)] min-h-0 flex-col overflow-hidden rounded-[20px] border border-(--ceremony-border) bg-(--ceremony-surface) shadow-[0_22px_50px_-20px_oklch(0.2_0.05_255/0.55)]"
          }
          role="dialog"
          aria-label={t("videoLibrary")}
        >
          <div className="flex shrink-0 items-center gap-1.5 border-b border-(--ceremony-border) bg-(--ceremony-surface-2) px-3 py-2.5 sm:gap-2">
            <p className="min-w-0 flex-1 truncate text-sm font-black tracking-tight text-(--ceremony-ink)">
              {t("videoLibrary")}
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              title={t("uploadVideo")}
              className="inline-flex min-h-9 min-w-0 max-w-[min(100%,14rem)] shrink items-center gap-1.5 rounded-full border border-(--ceremony-border) bg-(--ceremony-surface) px-2.5 text-[11px] font-bold text-(--ceremony-ink) transition enabled:hover:border-(--ceremony-primary) sm:px-3 sm:text-xs"
            >
              <Upload className="size-3.5 shrink-0" strokeWidth={2.5} />
              <span className="truncate">{t("uploadVideo")}</span>
            </button>
            <button
              type="button"
              onClick={toggleLibraryExpanded}
              className="grid size-9 shrink-0 place-items-center rounded-full text-(--ceremony-muted) transition hover:bg-(--ceremony-surface) hover:text-(--ceremony-ink)"
              aria-label={libraryExpanded ? t("videoShrinkPanel") : t("videoExpandPanel")}
              title={libraryExpanded ? t("videoShrinkPanel") : t("videoExpandPanel")}
            >
              {libraryExpanded ? (
                <Minimize2 className="size-[18px]" strokeWidth={2.25} />
              ) : (
                <Maximize2 className="size-[18px]" strokeWidth={2.25} />
              )}
            </button>
            <button
              type="button"
              onClick={closePanel}
              className="grid size-9 shrink-0 place-items-center rounded-full text-(--ceremony-muted) transition hover:bg-(--ceremony-surface) hover:text-(--ceremony-ink)"
              aria-label={t("close")}
            >
              <X className="size-[18px]" strokeWidth={2.5} />
            </button>
          </div>

          {uploadProgress ? (
            <div className="shrink-0 border-b border-(--ceremony-border) bg-(--ceremony-surface-2) px-3 py-2.5">
              <div className="mb-1 flex items-center justify-between gap-2 text-[11px] font-bold text-(--ceremony-ink)">
                <span className="min-w-0 truncate">{t("uploading")}</span>
                <span className="shrink-0 tabular-nums text-(--ceremony-muted)">{uploadProgress.percent}%</span>
              </div>
              <p className="mb-2 truncate text-[10px] font-medium text-(--ceremony-muted)" title={uploadProgress.fileName}>
                {uploadProgress.fileName}
                {uploadProgress.totalFiles > 1
                  ? ` · ${uploadProgress.fileIndex + 1}/${uploadProgress.totalFiles}`
                  : ""}
              </p>
              <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={uploadProgress.percent}
                aria-valuetext={`${uploadProgress.percent}%`}
                aria-label={t("uploading")}
                className="h-2 w-full overflow-hidden rounded-full bg-(--ceremony-primary-soft)"
              >
                <div
                  className="h-full rounded-full bg-(--ceremony-primary) transition-[width] duration-200 ease-out"
                  style={{ width: `${uploadProgress.percent}%` }}
                />
              </div>
            </div>
          ) : null}

          <div className="flex min-h-0 flex-1 flex-col">
            {error ? (
              <p className="m-3 shrink-0 rounded-xl bg-(--ceremony-danger-soft) px-3 py-2 text-xs font-semibold text-(--ceremony-danger)">
                {error}
              </p>
            ) : null}

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {videos.length === 0 ? (
                <p className="py-8 text-center text-sm text-(--ceremony-muted)">{t("noVideosYet")}</p>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  {videos.map((file) => {
                    const thumbSrc = `/api/files/${file.id}?preview=1`;
                    const isPlaying = activePlayingFile?.id === file.id;
                    return (
                      <div
                        key={file.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => selectVideo(file)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            selectVideo(file);
                          }
                        }}
                        className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border bg-(--ceremony-surface-2) text-left transition hover:shadow-md ${
                          isPlaying
                            ? "border-(--ceremony-primary) ring-2 ring-(--ceremony-primary)/35"
                            : "border-(--ceremony-border) hover:border-(--ceremony-primary)"
                        }`}
                        aria-label={file.originalName}
                        aria-current={isPlaying ? "true" : undefined}
                      >
                        <div className="relative aspect-video w-full bg-black">
                          <video
                            src={thumbSrc}
                            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-80"
                            muted
                            playsInline
                            preload="metadata"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-[oklch(0_0_0/0.25)] transition group-hover:bg-[oklch(0_0_0/0.35)]">
                            <Play className="size-9 text-white drop-shadow-md" fill="currentColor" />
                          </div>
                          <button
                            type="button"
                            onClick={(e) => openMenu(e, file)}
                            className="absolute right-1.5 top-1.5 z-10 grid size-8 place-items-center rounded-full bg-[oklch(0_0_0/0.55)] text-white backdrop-blur-sm transition hover:bg-[oklch(0_0_0/0.72)]"
                            aria-label={t("moreActions")}
                          >
                            <MoreVertical className="size-4" strokeWidth={2.25} />
                          </button>
                        </div>
                        <span className="line-clamp-2 px-2 py-1.5 text-[11px] font-semibold leading-snug text-(--ceremony-ink)">
                          {file.originalName}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {renameTarget ? (
            <div
              className="absolute inset-0 z-10 flex items-end justify-center bg-[oklch(0.12_0.03_255/0.45)] p-3 backdrop-blur-[2px] sm:items-center"
              role="presentation"
              onClick={() => setRenameTarget(null)}
            >
              <div
                className="w-full max-w-[320px] rounded-2xl border border-(--ceremony-border) bg-(--ceremony-surface) p-4 shadow-xl"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="text-sm font-bold text-(--ceremony-ink)">{t("rename")}</p>
                <label className="mt-2 block text-xs font-semibold text-(--ceremony-muted)">
                  {t("newFileName")}
                  <input
                    value={renameDraft}
                    onChange={(e) => setRenameDraft(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-(--ceremony-border) bg-(--ceremony-surface-2) px-3 py-2 text-sm font-medium text-(--ceremony-ink) outline-none focus:border-(--ceremony-primary)"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void saveRename();
                    }}
                  />
                </label>
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setRenameTarget(null)}
                    className="rounded-full px-4 py-2 text-sm font-bold text-(--ceremony-muted) hover:bg-(--ceremony-surface-2)"
                  >
                    {t("cancel")}
                  </button>
                  <button
                    type="button"
                    disabled={busy || !renameDraft.trim()}
                    onClick={() => void saveRename()}
                    className="rounded-full bg-(--ceremony-primary) px-4 py-2 text-sm font-bold text-(--ceremony-primary-ink) disabled:opacity-50"
                  >
                    {t("save")}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {menu ? (
        <div
          ref={menuRef}
          className="fixed z-[100] w-[148px] overflow-hidden rounded-xl border border-(--ceremony-border) bg-(--ceremony-surface) py-1 shadow-xl"
          style={{ left: menu.left, top: menu.top }}
          role="menu"
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full px-3 py-2.5 text-left text-sm font-semibold text-(--ceremony-ink) hover:bg-(--ceremony-surface-2)"
            onClick={() => openRename(menu.file)}
          >
            {t("rename")}
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full px-3 py-2.5 text-left text-sm font-semibold text-(--ceremony-danger) hover:bg-(--ceremony-danger-soft)"
            onClick={() => void removeVideo(menu.file)}
          >
            {t("remove")}
          </button>
        </div>
      ) : null}

      <button
        type="button"
        onClick={togglePanel}
        className="fixed bottom-5 right-4 z-[90] grid size-14 place-items-center rounded-full bg-(--ceremony-primary) text-(--ceremony-primary-ink) shadow-[0_12px_32px_-8px_oklch(0.35_0.12_255/0.5)] transition hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
        aria-expanded={panelOpen}
        aria-label={t("toggleVideoPanel")}
      >
        <Play className="size-7 translate-x-0.5" strokeWidth={2.25} />
      </button>
    </>
  );
}

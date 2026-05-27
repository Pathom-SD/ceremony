"use client";

import { useRef, useState } from "react";
import type { StoredFileRecord } from "@/lib/file-types";
import { useAppPreferences } from "./app-preferences";
import { FileCard } from "./file-card";

type Props = {
  topicId: string;
  topicLabel: string;
  departmentName?: string;
  files: StoredFileRecord[];
  onClose: () => void;
  onFilesUpdated: () => void;
  onPreview: (file: StoredFileRecord) => void;
};

export function TopicModal({
  topicId,
  topicLabel,
  departmentName,
  files,
  onClose,
  onFilesUpdated,
  onPreview,
}: Props) {
  const { t } = useAppPreferences();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (list: FileList | null) => {
    if (!list?.length) return;
    setUploading(true);
    setError(null);
    try {
      for (let i = 0; i < list.length; i++) {
        const file = list[i];
        const fd = new FormData();
        fd.set("file", file);
        const res = await fetch(`/api/topics/${topicId}/files`, {
          method: "POST",
          body: fd,
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(j.error ?? "UPLOAD_FAILED");
        }
      }
      onFilesUpdated();
    } catch (e) {
      setError(
        e instanceof Error && e.message === "INVALID_EXTENSION"
          ? t("uploadInvalid")
          : e instanceof Error && e.message === "VIDEO_TOPIC_ONLY"
            ? t("uploadVideoTopicOnly")
            : t("uploadFailed"),
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = async (fileId: string) => {
    setError(null);
    const res = await fetch(`/api/topics/${topicId}/files/${fileId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setError(t("removeFailed"));
      return;
    }
    onFilesUpdated();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[oklch(0.17_0.03_255/0.54)] p-0 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="topic-modal-title"
      onClick={onClose}
    >
      <div
        className="flex max-h-[min(92vh,900px)] w-full max-w-3xl flex-col rounded-t-[28px] border border-(--ceremony-border) bg-(--ceremony-surface) shadow-2xl sm:rounded-[28px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-(--ceremony-border) px-5 py-5 sm:px-6">
          <div>
            {departmentName ? (
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-(--ceremony-primary)">
                {t("department")} {departmentName}
              </p>
            ) : (
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-(--ceremony-primary)">
                {t("shared")}
              </p>
            )}
            <h2
              id="topic-modal-title"
              className="mt-1 text-2xl font-bold leading-snug tracking-[-0.03em] sm:text-3xl"
            >
              {topicLabel}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-10 rounded-full px-4 text-sm font-semibold text-(--ceremony-muted) transition hover:bg-(--ceremony-surface-2)"
          >
            {t("close")}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b border-(--ceremony-border) bg-(--ceremony-surface-2) px-5 py-4 sm:px-6">
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.doc,.docx,.odt,.rtf,.xls,.xlsx,.ods,.csv,.ppt,.pptx,.odp,.txt,.png,.jpg,.jpeg,.webp,.gif,.svg,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.oasis.opendocument.text,application/rtf,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.oasis.opendocument.spreadsheet,text/csv,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.oasis.opendocument.presentation,text/plain,image/*"
            multiple
            className="hidden"
            onChange={(e) => void upload(e.target.files)}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="min-h-11 rounded-full bg-(--ceremony-primary) px-5 py-2 text-sm font-bold text-(--ceremony-primary-ink) transition enabled:hover:-translate-y-0.5 enabled:hover:shadow-lg disabled:opacity-50"
          >
            {uploading ? t("uploading") : t("upload")}
          </button>
          <span className="text-xs text-(--ceremony-muted)">
            {t("uploadHint")}
          </span>
        </div>

        {error ? (
          <p className="mx-5 mt-4 rounded-2xl bg-(--ceremony-danger-soft) px-4 py-3 text-sm font-medium text-(--ceremony-danger) sm:mx-6">
            {error}
          </p>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">
          {files.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-(--ceremony-border) bg-(--ceremony-surface-2) px-4 py-12 text-center text-sm text-(--ceremony-muted)">
              {t("noFiles")}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {files.map((f) => (
                <FileCard
                  key={f.id}
                  file={f}
                  onPreview={() => onPreview(f)}
                  onRemove={() => void remove(f.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

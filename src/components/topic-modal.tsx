"use client";

import { useRef, useState } from "react";
import type { StoredFileRecord } from "@/lib/file-types";

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
          ? "รองรับเฉพาะ .pdf, .pptx, .xlsx"
          : "อัปโหลดไม่สำเร็จ",
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
      setError("ลบไฟล์ไม่สำเร็จ");
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
        className="flex max-h-[min(92vh,900px)] w-full max-w-3xl flex-col rounded-t-[28px] border border-[var(--ceremony-border)] bg-[var(--ceremony-surface)] shadow-2xl sm:rounded-[28px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--ceremony-border)] px-5 py-5 sm:px-6">
          <div>
            {departmentName ? (
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--ceremony-primary)]">
                แผนก {departmentName}
              </p>
            ) : (
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--ceremony-primary)]">
                หัวข้อร่วม
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
            className="min-h-10 rounded-full px-4 text-sm font-semibold text-[var(--ceremony-muted)] transition hover:bg-[var(--ceremony-surface-2)]"
          >
            ปิด
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b border-[var(--ceremony-border)] bg-[var(--ceremony-surface-2)] px-5 py-4 sm:px-6">
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.pptx,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            multiple
            className="hidden"
            onChange={(e) => void upload(e.target.files)}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="min-h-11 rounded-full bg-[var(--ceremony-primary)] px-5 py-2 text-sm font-bold text-[var(--ceremony-primary-ink)] transition enabled:hover:-translate-y-0.5 enabled:hover:shadow-lg disabled:opacity-50"
          >
            {uploading ? "กำลังอัปโหลด…" : "อัปโหลดไฟล์"}
          </button>
          <span className="text-xs text-[var(--ceremony-muted)]">
            PDF, PPTX, XLSX — อัปโหลดได้หลายไฟล์ต่อครั้ง
          </span>
        </div>

        {error ? (
          <p className="mx-5 mt-4 rounded-2xl bg-[var(--ceremony-danger-soft)] px-4 py-3 text-sm font-medium text-[var(--ceremony-danger)] sm:mx-6">
            {error}
          </p>
        ) : null}

        <ul className="flex-1 overflow-y-auto px-3 py-3 sm:px-4">
          {files.length === 0 ? (
            <li className="rounded-2xl border border-dashed border-[var(--ceremony-border)] bg-[var(--ceremony-surface-2)] px-4 py-12 text-center text-sm text-[var(--ceremony-muted)]">
              ยังไม่มีไฟล์ อัปโหลดเพื่อแสดงในการประชุม
            </li>
          ) : (
            files.map((f) => (
              <li
                key={f.id}
                className="flex flex-col gap-3 rounded-2xl border border-transparent px-3 py-3 transition hover:border-[var(--ceremony-border)] hover:bg-[var(--ceremony-surface-2)] sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{f.originalName}</p>
                  <p className="text-xs text-[var(--ceremony-muted)]">
                    {formatBytes(f.size)} ·{" "}
                    {formatUploadedAt(f.uploadedAt)}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => onPreview(f)}
                    className="min-h-9 rounded-full border border-[var(--ceremony-border)] bg-[var(--ceremony-surface)] px-3.5 text-xs font-bold hover:border-[var(--ceremony-primary)] hover:text-[var(--ceremony-primary)]"
                  >
                    เปิดดู / เต็มจอ
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(f.id)}
                    className="min-h-9 rounded-full border border-[color-mix(in_oklab,var(--ceremony-danger)_26%,transparent)] px-3.5 text-xs font-bold text-[var(--ceremony-danger)] hover:bg-[var(--ceremony-danger-soft)]"
                  >
                    ลบ
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}

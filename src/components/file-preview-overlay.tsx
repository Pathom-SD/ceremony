"use client";

import type { StoredFileRecord } from "@/lib/file-types";

type Props = {
  file: StoredFileRecord;
  onClose: () => void;
};

export function FilePreviewOverlay({ file, onClose }: Props) {
  const url = `/api/files/${file.id}?preview=1`;
  const isPdf = file.ext.toLowerCase() === ".pdf";

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-[oklch(0.16_0.03_255)]"
      role="dialog"
      aria-modal="true"
      aria-label="ดูเอกสารเต็มจอ"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-white sm:px-6">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{file.originalName}</p>
          <p className="text-xs opacity-75">
            {isPdf
              ? "แสดงตัวอย่าง PDF ในแอป"
              : "ไฟล์ Office — เปิดในแท็บใหม่เพื่อใช้โปรแกรมบนเครื่อง"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-10 rounded-full border border-white/20 px-4 py-2 text-xs font-bold hover:bg-white/10"
          >
            เปิดในแท็บใหม่
          </a>
          <button
            type="button"
            onClick={onClose}
            className="min-h-10 rounded-full bg-white px-4 py-2 text-xs font-bold text-[oklch(0.16_0.03_255)]"
          >
            ปิด
          </button>
        </div>
      </header>
      <div className="relative flex-1 bg-[oklch(0.2_0.025_255)]">
        {isPdf ? (
          <iframe
            title={file.originalName}
            src={url}
            className="absolute inset-0 h-full w-full border-0"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center text-white">
            <p className="max-w-md text-sm leading-relaxed opacity-90">
              ไฟล์ {file.ext.toUpperCase().replace(".", "")}{" "}
              ไม่สามารถแสดงตัวอย่างแบบฝังในเบราว์เซอร์ได้เท่า PDF
              กรุณาเปิดในแท็บใหม่หรือดาวน์โหลดไปเปิดด้วย Microsoft Office
            </p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-11 rounded-full bg-white px-6 py-3 text-sm font-bold text-[oklch(0.16_0.03_255)]"
            >
              เปิดไฟล์
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

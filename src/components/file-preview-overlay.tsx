"use client";

import type { StoredFileRecord } from "@/lib/file-types";
import { canPreviewAsPdf, isConvertibleExt, isImageExt } from "@/lib/file-types";
import { useAppPreferences } from "./app-preferences";
import { ImagePreview } from "./image-preview";
import { PdfViewer } from "./pdf-viewer";

type Props = {
  file: StoredFileRecord;
  onClose: () => void;
};

export function FilePreviewOverlay({ file, onClose }: Props) {
  const { t } = useAppPreferences();
  const ext = file.ext.toLowerCase();
  const isPdf = ext === ".pdf";
  const isImage = isImageExt(ext);
  const isConvertibleDoc = isConvertibleExt(ext);
  const showAsPdf = canPreviewAsPdf(ext);
  const pdfUrl = `/api/files/${file.id}/pdf`;
  const directUrl = `/api/files/${file.id}?preview=1`;

  const subtitle = isPdf
    ? t("previewPdf")
    : isImage
      ? t("previewImage")
      : isConvertibleDoc
        ? t("previewConverted")
        : t("fileRequiredOffice");

  return (
    <div
      className="fixed inset-0 z-60 flex flex-col bg-(--ceremony-surface) text-foreground"
      role="dialog"
      aria-modal="true"
      aria-label={t("fullScreenPreview")}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-(--ceremony-border) bg-(--ceremony-surface) px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{file.originalName}</p>
          <p className="text-xs text-(--ceremony-muted)">{subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onClose}
            className="min-h-10 rounded-full bg-(--ceremony-primary) px-4 py-2 text-xs font-bold text-(--ceremony-primary-ink) transition hover:opacity-90"
          >
            {t("close")}
          </button>
        </div>
      </header>
      <div className="relative min-h-0 flex-1 bg-background">
        {showAsPdf ? (
          <PdfViewer
            url={isPdf ? directUrl : pdfUrl}
            converting={isConvertibleDoc}
          />
        ) : isImage ? (
          <ImagePreview url={directUrl} alt={file.originalName} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center text-foreground">
            <p className="max-w-md text-sm leading-relaxed text-(--ceremony-muted)">
              ไฟล์ {file.ext.toUpperCase().replace(".", "")}{" "}
              {t("fileUnsupported")}
            </p>
            <a
              href={directUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-11 rounded-full bg-(--ceremony-primary) px-6 py-3 text-sm font-bold text-(--ceremony-primary-ink) transition hover:opacity-90"
            >
              {t("openFile")}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

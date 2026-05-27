import type { SessionPayload } from "./session-types";

export type StoredFileRecord = {
  id: string;
  topicId: string;
  originalName: string;
  ext: string;
  mime: string;
  size: number;
  uploadedAt: string;
};

export type FileIndexPayload = {
  files: StoredFileRecord[];
};

export const IMAGE_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".svg",
] as const;

export const VIDEO_EXTENSIONS = [
  ".mp4",
  ".m4v",
  ".webm",
  ".mkv",
  ".avi",
  ".ogg",
  ".ogv",
  ".mov",
] as const;

export const OFFICE_DOC_EXTENSIONS = [
  ".doc",
  ".docx",
  ".odt",
  ".rtf",
] as const;

export const OFFICE_SHEET_EXTENSIONS = [
  ".xls",
  ".xlsx",
  ".ods",
  ".csv",
] as const;

export const OFFICE_SLIDE_EXTENSIONS = [
  ".ppt",
  ".pptx",
  ".odp",
] as const;

export const TEXT_EXTENSIONS = [".txt"] as const;

export const CONVERTIBLE_EXTENSIONS = [
  ...OFFICE_DOC_EXTENSIONS,
  ...OFFICE_SHEET_EXTENSIONS,
  ...OFFICE_SLIDE_EXTENSIONS,
  ...TEXT_EXTENSIONS,
] as const;

export const ALLOWED_EXTENSIONS = [
  ".pdf",
  ...CONVERTIBLE_EXTENSIONS,
  ...IMAGE_EXTENSIONS,
  ...VIDEO_EXTENSIONS,
] as const;

export type AllowedExt = (typeof ALLOWED_EXTENSIONS)[number];

const extMime: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".odt": "application/vnd.oasis.opendocument.text",
  ".rtf": "application/rtf",
  ".xls": "application/vnd.ms-excel",
  ".xlsx":
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ods": "application/vnd.oasis.opendocument.spreadsheet",
  ".csv": "text/csv",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx":
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".odp": "application/vnd.oasis.opendocument.presentation",
  ".txt": "text/plain",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".m4v": "video/mp4",
  ".webm": "video/webm",
  ".mkv": "video/x-matroska",
  ".avi": "video/x-msvideo",
  ".ogg": "video/ogg",
  ".ogv": "video/ogg",
  ".mov": "video/quicktime",
};

export function mimeForExt(ext: string): string {
  return extMime[ext.toLowerCase()] ?? "application/octet-stream";
}

export function normalizeExt(filename: string): string | null {
  const lower = filename.toLowerCase();
  for (const ext of ALLOWED_EXTENSIONS) {
    if (lower.endsWith(ext)) return ext;
  }
  return null;
}

export function isImageExt(ext: string): boolean {
  const lower = ext.toLowerCase();
  return (IMAGE_EXTENSIONS as readonly string[]).includes(lower);
}

export function isVideoExt(ext: string): boolean {
  const lower = ext.toLowerCase();
  return (VIDEO_EXTENSIONS as readonly string[]).includes(lower);
}

export function isConvertibleExt(ext: string): boolean {
  const lower = ext.toLowerCase();
  return (CONVERTIBLE_EXTENSIONS as readonly string[]).includes(lower);
}

export function canPreviewAsPdf(ext: string): boolean {
  const lower = ext.toLowerCase();
  return lower === ".pdf" || isConvertibleExt(lower);
}

export type CeremonySocketEvents = {
  "session:updated": SessionPayload;
  "session:cleared": Record<string, never>;
  "files:changed": { topicId: string };
};

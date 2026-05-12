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

export const ALLOWED_EXTENSIONS = [".pdf", ".pptx", ".xlsx"] as const;

export type AllowedExt = (typeof ALLOWED_EXTENSIONS)[number];

const extMime: Record<string, string> = {
  ".pdf": "application/pdf",
  ".pptx":
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".xlsx":
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
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

export type CeremonySocketEvents = {
  "session:updated": SessionPayload;
  "session:cleared": Record<string, never>;
  "files:changed": { topicId: string };
};

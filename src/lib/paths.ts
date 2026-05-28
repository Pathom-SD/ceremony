import path from "node:path";

export const STORAGE_ROOT = path.join(process.cwd(), "storage");

export const SESSION_FILE = path.join(STORAGE_ROOT, "session.json");

export const FILE_INDEX = path.join(STORAGE_ROOT, "file-index.json");

export const UPLOADS_DIR = path.join(STORAGE_ROOT, "uploads");

/** temp อัปโหลด — ต้องอยู่ filesystem เดียวกับ UPLOADS_DIR (Docker volume ไม่ rename ข้าม /tmp ได้) */
export const UPLOAD_TMP_DIR = path.join(UPLOADS_DIR, ".tmp");

export const UPLOAD_CHUNKS_DIR = path.join(UPLOAD_TMP_DIR, "chunks");

export const CACHE_DIR = path.join(STORAGE_ROOT, "cache");

export const PDF_CACHE_DIR = path.join(CACHE_DIR, "pdf");

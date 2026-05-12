import path from "node:path";

export const STORAGE_ROOT = path.join(process.cwd(), "storage");

export const SESSION_FILE = path.join(STORAGE_ROOT, "session.json");

export const FILE_INDEX = path.join(STORAGE_ROOT, "file-index.json");

export const UPLOADS_DIR = path.join(STORAGE_ROOT, "uploads");

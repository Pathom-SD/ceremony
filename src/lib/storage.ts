import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { FILE_INDEX, SESSION_FILE, UPLOADS_DIR } from "./paths";
import type { FileIndexPayload, StoredFileRecord } from "./file-types";
import { mimeForExt, normalizeExt } from "./file-types";
import { defaultSession, type SessionPayload } from "./session-types";

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

export async function readSession(): Promise<SessionPayload> {
  try {
    const raw = await fs.readFile(SESSION_FILE, "utf8");
    const data = JSON.parse(raw) as SessionPayload;
    return { ...defaultSession, ...data };
  } catch {
    return { ...defaultSession };
  }
}

export async function writeSession(data: SessionPayload): Promise<void> {
  await ensureDir(path.dirname(SESSION_FILE));
  await fs.writeFile(SESSION_FILE, JSON.stringify(data, null, 2), "utf8");
}

export async function readFileIndex(): Promise<FileIndexPayload> {
  try {
    const raw = await fs.readFile(FILE_INDEX, "utf8");
    const parsed = JSON.parse(raw) as FileIndexPayload;
    if (!parsed.files || !Array.isArray(parsed.files)) return { files: [] };
    return { files: parsed.files };
  } catch {
    return { files: [] };
  }
}

async function writeFileIndex(data: FileIndexPayload): Promise<void> {
  await ensureDir(path.dirname(FILE_INDEX));
  await fs.writeFile(FILE_INDEX, JSON.stringify(data, null, 2), "utf8");
}

export function sanitizeOriginalName(name: string): string {
  const base = path.basename(name).replace(/[/\\]/g, "");
  return base.slice(0, 200) || "file";
}

export async function listFilesForTopic(
  topicId: string,
): Promise<StoredFileRecord[]> {
  const { files } = await readFileIndex();
  return files.filter((f) => f.topicId === topicId);
}

export async function getFileRecord(
  fileId: string,
): Promise<StoredFileRecord | null> {
  const { files } = await readFileIndex();
  return files.find((f) => f.id === fileId) ?? null;
}

export function diskPathFor(record: StoredFileRecord): string {
  return path.join(UPLOADS_DIR, record.topicId, `${record.id}${record.ext}`);
}

export async function saveUploadedFile(params: {
  topicId: string;
  originalName: string;
  buffer: Buffer;
}): Promise<StoredFileRecord> {
  const ext = normalizeExt(params.originalName);
  if (!ext) {
    throw new Error("INVALID_EXTENSION");
  }

  const id = randomUUID();
  const record: StoredFileRecord = {
    id,
    topicId: params.topicId,
    originalName: sanitizeOriginalName(params.originalName),
    ext,
    mime: mimeForExt(ext),
    size: params.buffer.length,
    uploadedAt: new Date().toISOString(),
  };

  const dir = path.join(UPLOADS_DIR, params.topicId);
  await ensureDir(dir);
  const fullPath = diskPathFor(record);
  await fs.writeFile(fullPath, params.buffer);

  const index = await readFileIndex();
  index.files.push(record);
  await writeFileIndex(index);
  return record;
}

export async function deleteFileRecord(fileId: string): Promise<boolean> {
  const index = await readFileIndex();
  const idx = index.files.findIndex((f) => f.id === fileId);
  if (idx === -1) return false;
  const [removed] = index.files.splice(idx, 1);
  try {
    await fs.unlink(diskPathFor(removed));
  } catch {
    /* ignore missing file */
  }
  await writeFileIndex(index);
  return true;
}

export async function clearAllStorage(): Promise<void> {
  await writeSession({ ...defaultSession });
  await writeFileIndex({ files: [] });
  try {
    const entries = await fs.readdir(UPLOADS_DIR, { withFileTypes: true });
    for (const e of entries) {
      if (e.name === ".gitkeep") continue;
      const p = path.join(UPLOADS_DIR, e.name);
      await fs.rm(p, { recursive: true, force: true });
    }
  } catch {
    await ensureDir(UPLOADS_DIR);
  }
}

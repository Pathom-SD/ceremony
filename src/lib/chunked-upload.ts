import { createWriteStream } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { finished } from "node:stream/promises";

export type ChunkUploadResult =
  | { ok: true; complete: false }
  | { ok: true; complete: true; partPath: string; fileName: string; fileSize: number }
  | {
      ok: false;
      error:
        | "BAD_CHUNK"
        | "CHUNK_TOO_LARGE"
        | "CHUNK_OUT_OF_ORDER"
        | "FILE_TOO_LARGE";
    };

type ReceiveChunkParams = {
  chunksDir: string;
  uploadId: string;
  chunkIndex: number;
  chunkTotal: number;
  fileName: string;
  fileSize: number;
  maxChunkBytes: number;
  body: ReadableStream<Uint8Array>;
};

function partPath(chunksDir: string, uploadId: string) {
  return join(chunksDir, `${uploadId}.part`);
}

function metaPath(chunksDir: string, uploadId: string) {
  return join(chunksDir, `${uploadId}.json`);
}

type ChunkMeta = {
  fileName: string;
  fileSize: number;
  chunkTotal: number;
  nextChunkIndex: number;
};

async function readMeta(chunksDir: string, uploadId: string): Promise<ChunkMeta | null> {
  try {
    const raw = await readFile(metaPath(chunksDir, uploadId), "utf8");
    return JSON.parse(raw) as ChunkMeta;
  } catch {
    return null;
  }
}

async function writeMeta(chunksDir: string, uploadId: string, meta: ChunkMeta) {
  await writeFile(metaPath(chunksDir, uploadId), JSON.stringify(meta), "utf8");
}

export async function receiveUploadChunk(
  params: ReceiveChunkParams,
): Promise<ChunkUploadResult> {
  const {
    chunksDir,
    uploadId,
    chunkIndex,
    chunkTotal,
    fileName,
    fileSize,
    maxChunkBytes,
    body,
  } = params;

  if (
    chunkTotal < 1 ||
    chunkIndex < 0 ||
    chunkIndex >= chunkTotal ||
    !fileName.trim() ||
    fileSize < 1
  ) {
    return { ok: false, error: "BAD_CHUNK" };
  }

  await mkdir(chunksDir, { recursive: true });

  let meta = await readMeta(chunksDir, uploadId);
  if (chunkIndex === 0) {
    meta = { fileName, fileSize, chunkTotal, nextChunkIndex: 0 };
    await writeMeta(chunksDir, uploadId, meta);
  } else if (!meta) {
    return { ok: false, error: "CHUNK_OUT_OF_ORDER" };
  }

  if (chunkIndex !== meta.nextChunkIndex) {
    return { ok: false, error: "CHUNK_OUT_OF_ORDER" };
  }

  const dest = partPath(chunksDir, uploadId);
  const flags = chunkIndex === 0 ? "w" : "a";
  const out = createWriteStream(dest, { flags });
  let bytes = 0;
  const stream = Readable.fromWeb(body as NodeReadableStream);
  stream.on("data", (chunk: Buffer) => {
    bytes += chunk.length;
    if (bytes > maxChunkBytes) stream.destroy();
  });

  try {
    await finished(stream.pipe(out));
  } catch {
    return { ok: false, error: "CHUNK_TOO_LARGE" };
  }

  if (bytes > maxChunkBytes) {
    return { ok: false, error: "CHUNK_TOO_LARGE" };
  }

  meta.nextChunkIndex = chunkIndex + 1;
  await writeMeta(chunksDir, uploadId, meta);

  if (chunkIndex < chunkTotal - 1) {
    return { ok: true, complete: false };
  }

  const fileStat = await stat(dest);
  if (fileStat.size !== fileSize) {
    return { ok: false, error: "BAD_CHUNK" };
  }

  return {
    ok: true,
    complete: true,
    partPath: dest,
    fileName: meta.fileName,
    fileSize: meta.fileSize,
  };
}

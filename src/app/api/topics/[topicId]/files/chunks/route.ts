import { mkdir, unlink } from "node:fs/promises";
import { NextResponse } from "next/server";
import { receiveUploadChunk } from "@/lib/chunked-upload";
import { ceremonyVideosTopic, isValidTopicId } from "@/lib/ceremony-topics";
import { isVideoExt, normalizeExt } from "@/lib/file-types";
import { emitCeremony } from "@/lib/io-registry";
import { UPLOAD_CHUNKS_DIR } from "@/lib/paths";
import { saveUploadedFileFromPath } from "@/lib/storage";
import {
  getMaxUploadBytesForTopic,
  isUploadTooLarge,
} from "@/lib/upload-limits";
import { UPLOAD_CHUNK_SIZE_BYTES } from "@/lib/upload-limits.constants";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteCtx = { params: Promise<{ topicId: string }> };

function parseChunkHeaders(request: Request) {
  const uploadId = request.headers.get("x-upload-id")?.trim() ?? "";
  const chunkIndex = Number(request.headers.get("x-chunk-index"));
  const chunkTotal = Number(request.headers.get("x-chunk-total"));
  const rawName = request.headers.get("x-file-name")?.trim() ?? "";
  const fileName = rawName ? decodeURIComponent(rawName) : "";
  const fileSize = Number(request.headers.get("x-file-size"));
  return { uploadId, chunkIndex, chunkTotal, fileName, fileSize };
}

async function cleanupChunkArtifacts(uploadId: string) {
  await unlink(`${UPLOAD_CHUNKS_DIR}/${uploadId}.part`).catch(() => {});
  await unlink(`${UPLOAD_CHUNKS_DIR}/${uploadId}.json`).catch(() => {});
}

export async function POST(request: Request, ctx: RouteCtx) {
  const { topicId } = await ctx.params;
  if (!isValidTopicId(topicId)) {
    return NextResponse.json({ error: "UNKNOWN_TOPIC" }, { status: 404 });
  }

  const { uploadId, chunkIndex, chunkTotal, fileName, fileSize } =
    parseChunkHeaders(request);
  if (!uploadId || !Number.isInteger(chunkIndex) || !Number.isInteger(chunkTotal)) {
    return NextResponse.json({ error: "BAD_CHUNK" }, { status: 400 });
  }

  if (isUploadTooLarge(topicId, fileSize)) {
    return NextResponse.json({ error: "FILE_TOO_LARGE" }, { status: 413 });
  }

  const ext = normalizeExt(fileName);
  if (ext && isVideoExt(ext) && topicId !== ceremonyVideosTopic.id) {
    return NextResponse.json({ error: "VIDEO_TOPIC_ONLY" }, { status: 400 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > UPLOAD_CHUNK_SIZE_BYTES) {
    return NextResponse.json({ error: "CHUNK_TOO_LARGE" }, { status: 413 });
  }

  if (!request.body) {
    return NextResponse.json({ error: "BAD_CHUNK" }, { status: 400 });
  }

  await mkdir(UPLOAD_CHUNKS_DIR, { recursive: true });

  const received = await receiveUploadChunk({
    chunksDir: UPLOAD_CHUNKS_DIR,
    uploadId,
    chunkIndex,
    chunkTotal,
    fileName,
    fileSize,
    maxChunkBytes: UPLOAD_CHUNK_SIZE_BYTES,
    body: request.body,
  });

  if (!received.ok) {
    const status =
      received.error === "FILE_TOO_LARGE" || received.error === "CHUNK_TOO_LARGE"
        ? 413
        : received.error === "CHUNK_OUT_OF_ORDER"
          ? 409
          : 400;
    return NextResponse.json({ error: received.error }, { status });
  }

  if (!received.complete) {
    return NextResponse.json({ complete: false });
  }

  try {
    const record = await saveUploadedFileFromPath({
      topicId,
      originalName: received.fileName,
      sourcePath: received.partPath,
      size: received.fileSize,
    });
    await cleanupChunkArtifacts(uploadId);
    emitCeremony("files:changed", { topicId });
    return NextResponse.json({ complete: true, file: record });
  } catch (e) {
    await cleanupChunkArtifacts(uploadId);
    if (e instanceof Error && e.message === "INVALID_EXTENSION") {
      return NextResponse.json({ error: "INVALID_EXTENSION" }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "UPLOAD_FAILED" }, { status: 500 });
  }
}

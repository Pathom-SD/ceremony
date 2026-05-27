import { NextResponse } from "next/server";
import { ceremonyVideosTopic, isValidTopicId } from "@/lib/ceremony-topics";
import { ALLOWED_EXTENSIONS, isVideoExt, normalizeExt } from "@/lib/file-types";
import { emitCeremony } from "@/lib/io-registry";
import { receiveMultipartFileUpload } from "@/lib/multipart-upload";
import {
  getMaxUploadBytesForTopic,
  isUploadTooLarge,
} from "@/lib/upload-limits";
import { listFilesForTopic, saveUploadedFileFromPath } from "@/lib/storage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteCtx = { params: Promise<{ topicId: string }> };

export async function GET(_request: Request, ctx: RouteCtx) {
  const { topicId } = await ctx.params;
  if (!isValidTopicId(topicId)) {
    return NextResponse.json({ error: "UNKNOWN_TOPIC" }, { status: 404 });
  }
  const files = await listFilesForTopic(topicId);
  return NextResponse.json({ files });
}

export async function POST(request: Request, ctx: RouteCtx) {
  const { topicId } = await ctx.params;
  if (!isValidTopicId(topicId)) {
    return NextResponse.json({ error: "UNKNOWN_TOPIC" }, { status: 404 });
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 0 && isUploadTooLarge(topicId, contentLength)) {
    return NextResponse.json({ error: "FILE_TOO_LARGE" }, { status: 413 });
  }

  const maxFileBytes = getMaxUploadBytesForTopic(topicId);
  const uploaded = await receiveMultipartFileUpload(request, { maxFileBytes });

  if (!uploaded.ok) {
    const status =
      uploaded.error === "FILE_TOO_LARGE"
        ? 413
        : uploaded.error === "FILE_REQUIRED"
          ? 400
          : 400;
    return NextResponse.json({ error: uploaded.error }, { status });
  }

  const originalName = uploaded.filename || "upload";
  const ext = normalizeExt(originalName);
  if (ext && isVideoExt(ext) && topicId !== ceremonyVideosTopic.id) {
    return NextResponse.json({ error: "VIDEO_TOPIC_ONLY" }, { status: 400 });
  }

  try {
    const record = await saveUploadedFileFromPath({
      topicId,
      originalName,
      sourcePath: uploaded.tempPath,
      size: uploaded.size,
    });
    emitCeremony("files:changed", { topicId });
    return NextResponse.json({ file: record });
  } catch (e) {
    if (e instanceof Error && e.message === "INVALID_EXTENSION") {
      return NextResponse.json(
        { error: "INVALID_EXTENSION", allowed: [...ALLOWED_EXTENSIONS] },
        { status: 400 },
      );
    }
    console.error(e);
    return NextResponse.json({ error: "UPLOAD_FAILED" }, { status: 500 });
  }
}

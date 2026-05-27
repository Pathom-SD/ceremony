import { NextResponse } from "next/server";
import { ceremonyVideosTopic, isValidTopicId } from "@/lib/ceremony-topics";
import { ALLOWED_EXTENSIONS, isVideoExt, normalizeExt } from "@/lib/file-types";
import { emitCeremony } from "@/lib/io-registry";
import { listFilesForTopic, saveUploadedFile } from "@/lib/storage";

export const dynamic = "force-dynamic";

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

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "BAD_FORM" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "FILE_REQUIRED" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const originalName = file.name || "upload";

  const ext = normalizeExt(originalName);
  if (ext && isVideoExt(ext) && topicId !== ceremonyVideosTopic.id) {
    return NextResponse.json({ error: "VIDEO_TOPIC_ONLY" }, { status: 400 });
  }

  try {
    const record = await saveUploadedFile({
      topicId,
      originalName,
      buffer: buf,
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

import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { getFileRecord, diskPathFor } from "@/lib/storage";
import { isStreamableVideo, videoFileResponse } from "@/lib/video-stream";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ fileId: string }> };

async function serveFile(request: Request, ctx: RouteCtx) {
  const { fileId } = await ctx.params;
  const record = await getFileRecord(fileId);
  if (!record) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const url = new URL(request.url);
  const preview = url.searchParams.get("preview") === "1";
  const filePath = diskPathFor(record);

  if (isStreamableVideo(record)) {
    return videoFileResponse(request, filePath, record, preview);
  }

  let body: Buffer;
  try {
    body = await fs.readFile(filePath);
  } catch {
    return NextResponse.json({ error: "FILE_MISSING" }, { status: 404 });
  }

  const disposition = preview
    ? `inline; filename*=UTF-8''${encodeURIComponent(record.originalName)}`
    : `attachment; filename*=UTF-8''${encodeURIComponent(record.originalName)}`;

  return new NextResponse(new Uint8Array(body), {
    status: 200,
    headers: {
      "Content-Type": record.mime,
      "Content-Disposition": disposition,
      "Cache-Control": "private, no-store",
    },
  });
}

export async function GET(request: Request, ctx: RouteCtx) {
  return serveFile(request, ctx);
}

export async function HEAD(request: Request, ctx: RouteCtx) {
  return serveFile(request, ctx);
}

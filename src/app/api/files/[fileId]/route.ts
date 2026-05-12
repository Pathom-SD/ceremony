import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { getFileRecord, diskPathFor } from "@/lib/storage";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ fileId: string }> };

export async function GET(request: Request, ctx: RouteCtx) {
  const { fileId } = await ctx.params;
  const record = await getFileRecord(fileId);
  if (!record) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  const url = new URL(request.url);
  const preview = url.searchParams.get("preview") === "1";

  let body: Buffer;
  try {
    body = await fs.readFile(diskPathFor(record));
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

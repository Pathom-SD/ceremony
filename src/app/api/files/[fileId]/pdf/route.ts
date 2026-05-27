import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { canPreviewAsPdf } from "@/lib/file-types";
import { ConvertError, ensurePdfForRecord } from "@/lib/document-convert";
import { getFileRecord } from "@/lib/storage";

export const dynamic = "force-dynamic";

type RouteCtx = { params: Promise<{ fileId: string }> };

export async function GET(_request: Request, ctx: RouteCtx) {
  const { fileId } = await ctx.params;
  const record = await getFileRecord(fileId);
  if (!record) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  if (!canPreviewAsPdf(record.ext)) {
    return NextResponse.json(
      { error: "UNSUPPORTED_EXTENSION" },
      { status: 415 },
    );
  }

  let pdfPath: string;
  try {
    pdfPath = await ensurePdfForRecord(record);
  } catch (err) {
    if (err instanceof ConvertError) {
      console.error("convert failed", err.code, err.message);
      const status = err.code === "CONVERTER_UNAVAILABLE" ? 503 : 500;
      return NextResponse.json({ error: err.code }, { status });
    }
    console.error("convert error", err);
    return NextResponse.json({ error: "CONVERTER_FAILED" }, { status: 500 });
  }

  let body: Buffer;
  try {
    body = await fs.readFile(pdfPath);
  } catch {
    return NextResponse.json({ error: "FILE_MISSING" }, { status: 404 });
  }

  const previewName = record.originalName.replace(/\.[^.]+$/, "") + ".pdf";
  return new NextResponse(new Uint8Array(body), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(
        previewName,
      )}`,
      "Cache-Control": "private, max-age=300",
    },
  });
}

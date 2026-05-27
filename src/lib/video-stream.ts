import { createReadStream } from "node:fs";
import type { ReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import type { StoredFileRecord } from "@/lib/file-types";
import { isVideoExt } from "@/lib/file-types";

const CACHE_CONTROL = "private, no-store";

type ByteRange = { start: number; end: number };

export function isStreamableVideo(record: StoredFileRecord): boolean {
  return record.mime.startsWith("video/") || isVideoExt(record.ext);
}

function contentDisposition(record: StoredFileRecord, preview: boolean): string {
  const mode = preview ? "inline" : "attachment";
  return `${mode}; filename*=UTF-8''${encodeURIComponent(record.originalName)}`;
}

/** Parses a single `bytes=` range; null = no Range header semantics (full file). */
function parseSingleByteRange(
  rangeHeader: string,
  size: number,
): ByteRange | "unsatisfied" | null {
  const trimmed = rangeHeader.trim();
  if (!trimmed.startsWith("bytes=")) return null;

  let spec = trimmed.slice(6).trim();
  const comma = spec.indexOf(",");
  if (comma !== -1) spec = spec.slice(0, comma).trim();

  const dash = spec.indexOf("-");
  if (dash === -1) return "unsatisfied";

  const startStr = spec.slice(0, dash);
  const endStr = spec.slice(dash + 1);

  let start: number;
  let end: number;

  if (startStr === "" && endStr !== "") {
    const suffix = Number.parseInt(endStr, 10);
    if (!Number.isFinite(suffix) || suffix <= 0) return "unsatisfied";
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else if (startStr !== "") {
    start = Number.parseInt(startStr, 10);
    if (!Number.isFinite(start)) return "unsatisfied";
    if (endStr === "") {
      end = size - 1;
    } else {
      end = Number.parseInt(endStr, 10);
      if (!Number.isFinite(end)) return "unsatisfied";
    }
  } else {
    return null;
  }

  if (start < 0 || end < start || start >= size) return "unsatisfied";
  end = Math.min(end, size - 1);
  return { start, end };
}

function destroyReadStream(stream: ReadStream) {
  if (!stream.destroyed) stream.destroy();
}

function createAbortableFileRangeStream(
  filePath: string,
  range: ByteRange,
  signal?: AbortSignal,
): ReadableStream<Uint8Array> {
  const nodeStream = createReadStream(filePath, { start: range.start, end: range.end });

  const stop = () => {
    destroyReadStream(nodeStream);
  };

  const onAbort = () => stop();
  signal?.addEventListener("abort", onAbort, { once: true });

  return new ReadableStream<Uint8Array>({
    start(controller) {
      nodeStream.on("data", (chunk: string | Buffer) => {
        try {
          const bytes = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
          controller.enqueue(new Uint8Array(bytes));
        } catch {
          stop();
        }
      });
      nodeStream.on("end", () => {
        signal?.removeEventListener("abort", onAbort);
        try {
          controller.close();
        } catch {
          /* consumer already closed */
        }
      });
      nodeStream.on("error", () => {
        stop();
        try {
          controller.close();
        } catch {
          /* consumer already closed */
        }
      });
    },
    cancel() {
      signal?.removeEventListener("abort", onAbort);
      stop();
    },
  });
}

function streamHeaders(
  record: StoredFileRecord,
  preview: boolean,
  size: number,
  contentLength: number,
  contentRange?: string,
): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": record.mime,
    "Content-Disposition": contentDisposition(record, preview),
    "Cache-Control": CACHE_CONTROL,
    "Accept-Ranges": "bytes",
    "Content-Length": String(contentLength),
  };
  if (contentRange) headers["Content-Range"] = contentRange;
  return headers;
}

export async function videoFileResponse(
  request: Request,
  filePath: string,
  record: StoredFileRecord,
  preview: boolean,
): Promise<Response> {
  let fileSize: number;
  try {
    fileSize = (await stat(filePath)).size;
  } catch {
    return Response.json({ error: "FILE_MISSING" }, { status: 404 });
  }

  const rangeHeader = request.headers.get("range");
  const parsed = rangeHeader ? parseSingleByteRange(rangeHeader, fileSize) : null;

  if (parsed === "unsatisfied") {
    return new Response(null, {
      status: 416,
      headers: {
        "Content-Type": record.mime,
        "Content-Disposition": contentDisposition(record, preview),
        "Cache-Control": CACHE_CONTROL,
        "Accept-Ranges": "bytes",
        "Content-Range": `bytes */${fileSize}`,
      },
    });
  }

  const range: ByteRange = parsed ?? { start: 0, end: fileSize - 1 };
  const isPartial = parsed !== null;
  const chunkLength = range.end - range.start + 1;
  const contentRange = isPartial
    ? `bytes ${range.start}-${range.end}/${fileSize}`
    : undefined;

  if (request.method === "HEAD") {
    return new Response(null, {
      status: isPartial ? 206 : 200,
      headers: streamHeaders(record, preview, fileSize, chunkLength, contentRange),
    });
  }

  const body = createAbortableFileRangeStream(
    filePath,
    range,
    request.signal,
  );

  return new Response(body, {
    status: isPartial ? 206 : 200,
    headers: streamHeaders(record, preview, fileSize, chunkLength, contentRange),
  });
}

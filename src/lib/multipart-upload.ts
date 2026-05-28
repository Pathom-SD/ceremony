import { createWriteStream } from "node:fs";
import { unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { finished } from "node:stream/promises";
import Busboy from "busboy";

/** บัฟเฟอร์เขียนดิสก์ใหญ่ขึ้นลด syscall ตอนอัปโหลดวิดีโอหลายร้อย MB–GB */
const DISK_WRITE_HIGH_WATER_MARK = 1024 * 1024;

export type MultipartUploadResult =
  | {
      ok: true;
      filename: string;
      tempPath: string;
      size: number;
    }
  | { ok: false; error: "BAD_FORM" | "FILE_REQUIRED" | "FILE_TOO_LARGE" };

type Options = {
  fieldName?: string;
  maxFileBytes: number;
  /** ค่าเริ่มต้น os.tmpdir() — ใน Docker ใช้ UPLOAD_TMP_DIR เพื่อให้ rename ไป uploads/ ได้ */
  tempDir?: string;
};

export async function receiveMultipartFileUpload(
  request: Request,
  options: Options,
): Promise<MultipartUploadResult> {
  const fieldName = options.fieldName ?? "file";
  const contentType = request.headers.get("content-type");
  if (!contentType?.includes("multipart/form-data") || !request.body) {
    return { ok: false, error: "BAD_FORM" };
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: MultipartUploadResult) => {
      if (settled) return;
      settled = true;
      resolve(result);
    };

    const busboy = Busboy({
      headers: { "content-type": contentType },
      limits: { files: 1, fileSize: options.maxFileBytes },
    });

    let gotFile = false;
    let tempPath = "";
    let filename = "upload";
    let size = 0;
    let writeDone: Promise<void> | null = null;

    const cleanupTemp = async () => {
      if (tempPath) await unlink(tempPath).catch(() => {});
    };

    busboy.on("file", (name, stream, info) => {
      if (name !== fieldName || gotFile) {
        stream.resume();
        return;
      }
      gotFile = true;
      filename = info.filename || "upload";
      tempPath = join(options.tempDir ?? tmpdir(), `ceremony-upload-${randomUUID()}`);
      const out = createWriteStream(tempPath, {
        highWaterMark: DISK_WRITE_HIGH_WATER_MARK,
      });
      stream.on("data", (chunk: Buffer) => {
        size += chunk.length;
      });
      stream.on("limit", () => {
        void cleanupTemp().then(() => finish({ ok: false, error: "FILE_TOO_LARGE" }));
        stream.resume();
      });
      writeDone = finished(stream.pipe(out));
    });

    busboy.on("finish", () => {
      void (async () => {
        try {
          if (writeDone) await writeDone;
          if (!gotFile) {
            finish({ ok: false, error: "FILE_REQUIRED" });
            return;
          }
          if (settled) {
            await cleanupTemp();
            return;
          }
          finish({ ok: true, filename, tempPath, size });
        } catch {
          await cleanupTemp();
          finish({ ok: false, error: "BAD_FORM" });
        }
      })();
    });

    busboy.on("error", () => {
      void cleanupTemp().then(() => finish({ ok: false, error: "BAD_FORM" }));
    });

    Readable.fromWeb(request.body as NodeReadableStream).pipe(busboy);
  });
}

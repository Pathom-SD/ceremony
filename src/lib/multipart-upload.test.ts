import { readFile, unlink } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { receiveMultipartFileUpload } from "@/lib/multipart-upload";

function multipartUploadRequest(
  boundary: string,
  file: { name: string; filename: string; data: Buffer },
) {
  const head = `--${boundary}\r\nContent-Disposition: form-data; name="${file.name}"; filename="${file.filename}"\r\nContent-Type: video/mp4\r\n\r\n`;
  const tail = `\r\n--${boundary}--\r\n`;
  const body = Buffer.concat([Buffer.from(head), file.data, Buffer.from(tail)]);
  return new Request("http://test/upload", {
    method: "POST",
    headers: {
      "content-type": `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });
}

describe("receiveMultipartFileUpload", () => {
  it("streams multipart file data to a temp file on disk", async () => {
    const payload = Buffer.alloc(256 * 1024, 0xab);
    const request = multipartUploadRequest("----ceremony", {
      name: "file",
      filename: "clip.mp4",
      data: payload,
    });

    const result = await receiveMultipartFileUpload(request, {
      maxFileBytes: 5 * 1024 ** 3,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.filename).toBe("clip.mp4");
    expect(result.size).toBe(payload.length);

    const onDisk = await readFile(result.tempPath);
    expect(onDisk.equals(payload)).toBe(true);
    await unlink(result.tempPath);
  });

  it("returns FILE_TOO_LARGE when the file exceeds the limit", async () => {
    const request = multipartUploadRequest("----ceremony", {
      name: "file",
      filename: "big.mp4",
      data: Buffer.alloc(64),
    });

    const result = await receiveMultipartFileUpload(request, {
      maxFileBytes: 32,
    });

    expect(result).toEqual({ ok: false, error: "FILE_TOO_LARGE" });
  });
});

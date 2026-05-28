import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it, afterEach } from "vitest";
import { receiveUploadChunk } from "@/lib/chunked-upload";

describe("receiveUploadChunk", () => {
  let chunksDir = "";

  afterEach(async () => {
    if (chunksDir) await rm(chunksDir, { recursive: true, force: true });
  });

  it("stores the first chunk on disk and reports incomplete upload", async () => {
    chunksDir = await mkdtemp(join(tmpdir(), "ceremony-chunks-"));
    const uploadId = "11111111-1111-4111-8111-111111111111";
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array([1, 2, 3, 4]));
        controller.close();
      },
    });

    const result = await receiveUploadChunk({
      chunksDir,
      uploadId,
      chunkIndex: 0,
      chunkTotal: 2,
      fileName: "clip.mp4",
      fileSize: 8,
      maxChunkBytes: 50 * 1024 ** 2,
      body,
    });

    expect(result).toEqual({ ok: true, complete: false });
    const part = await readFile(join(chunksDir, `${uploadId}.part`));
    expect([...part]).toEqual([1, 2, 3, 4]);
  });

  it("appends further chunks in order and completes on the last chunk", async () => {
    chunksDir = await mkdtemp(join(tmpdir(), "ceremony-chunks-"));
    const uploadId = "22222222-2222-4222-8222-222222222222";

    const first = await receiveUploadChunk({
      chunksDir,
      uploadId,
      chunkIndex: 0,
      chunkTotal: 2,
      fileName: "clip.mp4",
      fileSize: 8,
      maxChunkBytes: 50 * 1024 ** 2,
      body: new ReadableStream({
        start(c) {
          c.enqueue(new Uint8Array([1, 2, 3, 4]));
          c.close();
        },
      }),
    });
    expect(first).toEqual({ ok: true, complete: false });

    const last = await receiveUploadChunk({
      chunksDir,
      uploadId,
      chunkIndex: 1,
      chunkTotal: 2,
      fileName: "clip.mp4",
      fileSize: 8,
      maxChunkBytes: 50 * 1024 ** 2,
      body: new ReadableStream({
        start(c) {
          c.enqueue(new Uint8Array([5, 6, 7, 8]));
          c.close();
        },
      }),
    });

    expect(last).toMatchObject({
      ok: true,
      complete: true,
      fileName: "clip.mp4",
      fileSize: 8,
    });
    const part = await readFile(join(chunksDir, `${uploadId}.part`));
    expect([...part]).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("rejects chunks that arrive out of order", async () => {
    chunksDir = await mkdtemp(join(tmpdir(), "ceremony-chunks-"));
    const uploadId = "33333333-3333-4333-8333-333333333333";

    const result = await receiveUploadChunk({
      chunksDir,
      uploadId,
      chunkIndex: 1,
      chunkTotal: 2,
      fileName: "clip.mp4",
      fileSize: 8,
      maxChunkBytes: 50 * 1024 ** 2,
      body: new ReadableStream({
        start(c) {
          c.enqueue(new Uint8Array([5, 6, 7, 8]));
          c.close();
        },
      }),
    });

    expect(result).toEqual({ ok: false, error: "CHUNK_OUT_OF_ORDER" });
  });
});

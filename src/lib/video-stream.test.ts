import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { StoredFileRecord } from "@/lib/file-types";
import { videoFileResponse } from "@/lib/video-stream";

function sampleRecord(size: number): StoredFileRecord {
  return {
    id: "test-id",
    topicId: "ceremony-videos",
    originalName: "clip.mp4",
    ext: ".mp4",
    mime: "video/mp4",
    size,
    uploadedAt: new Date().toISOString(),
  };
}

describe("videoFileResponse", () => {
  let tempDir: string | undefined;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  it("canceling the body reader stops the stream without uncaught exceptions", async () => {
    const uncaught: unknown[] = [];
    const onUncaught = (err: unknown) => {
      uncaught.push(err);
    };
    process.on("uncaughtException", onUncaught);

    try {
      tempDir = await mkdtemp(path.join(tmpdir(), "ceremony-video-"));
      const filePath = path.join(tempDir, "clip.mp4");
      const bytes = Buffer.alloc(512 * 1024, 0x42);
      await writeFile(filePath, bytes);
      const record = sampleRecord(bytes.length);

      const request = new Request("http://localhost/api/files/test?preview=1", {
        headers: { Range: "bytes=0-" },
      });
      const response = await videoFileResponse(request, filePath, record, true);

      const reader = response.body!.getReader();
      await reader.read();
      await reader.cancel();
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(uncaught).toEqual([]);
    } finally {
      process.off("uncaughtException", onUncaught);
    }
  });

  it("rapid overlapping range requests can be abandoned safely", async () => {
    const uncaught: unknown[] = [];
    const unhandled: unknown[] = [];
    const onUncaught = (err: unknown) => {
      uncaught.push(err);
    };
    const onUnhandled = (err: unknown) => {
      unhandled.push(err);
    };
    process.on("uncaughtException", onUncaught);
    process.on("unhandledRejection", onUnhandled);

    try {
      tempDir = await mkdtemp(path.join(tmpdir(), "ceremony-video-"));
      const filePath = path.join(tempDir, "clip.mp4");
      const bytes = Buffer.alloc(1024 * 1024, 0x42);
      await writeFile(filePath, bytes);
      const record = sampleRecord(bytes.length);

      for (let i = 0; i < 40; i++) {
        const start = (i * 16_384) % (bytes.length - 16_384);
        const end = start + 16_383;
        const response = await videoFileResponse(
          new Request(`http://localhost/${i}`, {
            headers: { Range: `bytes=${start}-${end}` },
          }),
          filePath,
          record,
          true,
        );
        const reader = response.body!.getReader();
        void reader.read();
        await reader.cancel();
      }

      await new Promise((resolve) => setTimeout(resolve, 300));
      expect(uncaught).toEqual([]);
      expect(unhandled).toEqual([]);
    } finally {
      process.off("uncaughtException", onUncaught);
      process.off("unhandledRejection", onUnhandled);
    }
  });

  it("abandoning an earlier range response while another reads does not throw", async () => {
    const uncaught: unknown[] = [];
    const onUncaught = (err: unknown) => {
      uncaught.push(err);
    };
    process.on("uncaughtException", onUncaught);

    try {
      tempDir = await mkdtemp(path.join(tmpdir(), "ceremony-video-"));
      const filePath = path.join(tempDir, "clip.mp4");
      const bytes = Buffer.alloc(512 * 1024, 0x42);
      await writeFile(filePath, bytes);
      const record = sampleRecord(bytes.length);

      const first = await videoFileResponse(
        new Request("http://localhost/a", { headers: { Range: "bytes=0-65535" } }),
        filePath,
        record,
        true,
      );
      const second = await videoFileResponse(
        new Request("http://localhost/b", { headers: { Range: "bytes=262144-" } }),
        filePath,
        record,
        true,
      );

      const firstReader = first.body!.getReader();
      await firstReader.read();
      await firstReader.cancel();

      const secondReader = second.body!.getReader();
      await secondReader.read();
      await secondReader.cancel();

      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(uncaught).toEqual([]);
    } finally {
      process.off("uncaughtException", onUncaught);
    }
  });
});

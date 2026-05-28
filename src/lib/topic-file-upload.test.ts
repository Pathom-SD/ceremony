import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CHUNKED_UPLOAD_THRESHOLD_BYTES,
  UPLOAD_CHUNK_SIZE_BYTES,
} from "@/lib/upload-limits.constants";
import { uploadTopicFile, UPLOAD_ABORTED } from "@/lib/topic-file-upload";

describe("uploadTopicFile", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("uploads large files as sequential chunks under the chunks API", async () => {
    const sent: { url: string; index: number; total: number; size: number }[] = [];

    class MockXHR {
      upload = { onprogress: null as ((ev: ProgressEvent) => void) | null };
      onabort: (() => void) | null = null;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      status = 200;
      responseText = JSON.stringify({ complete: false });
      url = "";
      open(_method: string, openUrl: string) {
        this.url = openUrl;
      }
      send = vi.fn((body: Blob) => {
        const chunkIndex = Number(this.headers["X-Chunk-Index"]);
        const chunkTotal = Number(this.headers["X-Chunk-Total"]);
        sent.push({
          url: this.url,
          index: chunkIndex,
          total: chunkTotal,
          size: body.size,
        });
        if (chunkIndex === chunkTotal - 1) {
          this.responseText = JSON.stringify({
            complete: true,
            file: { id: "f1" },
          });
        }
        queueMicrotask(() => this.onload?.());
      });
      abort = vi.fn(() => this.onabort?.());
      headers: Record<string, string> = {};
      setRequestHeader(name: string, value: string) {
        this.headers[name] = value;
      }
    }

    vi.stubGlobal("XMLHttpRequest", MockXHR as unknown as typeof XMLHttpRequest);
    vi.stubGlobal("crypto", {
      randomUUID: () => "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    });

    const bytes = CHUNKED_UPLOAD_THRESHOLD_BYTES + UPLOAD_CHUNK_SIZE_BYTES;
    const file = new File([new Uint8Array(bytes)], "big.mp4", {
      type: "video/mp4",
    });

    await uploadTopicFile("ceremony-videos", file, () => undefined).promise;

    expect(sent).toHaveLength(3);
    expect(sent[0]?.url).toBe("/api/topics/ceremony-videos/files/chunks");
    expect(sent.map((s) => s.index)).toEqual([0, 1, 2]);
    expect(sent[0]?.size).toBe(UPLOAD_CHUNK_SIZE_BYTES);
    expect(sent[2]?.size).toBe(
      bytes - UPLOAD_CHUNK_SIZE_BYTES * 2,
    );
  });

  it("starts chunked upload when randomUUID throws on non-secure HTTP (LAN IP)", async () => {
    const sent: string[] = [];

    class MockXHR {
      upload = { onprogress: null as ((ev: ProgressEvent) => void) | null };
      onabort: (() => void) | null = null;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      status = 200;
      responseText = JSON.stringify({ complete: false });
      url = "";
      headers: Record<string, string> = {};
      open(_method: string, openUrl: string) {
        this.url = openUrl;
      }
      setRequestHeader(name: string, value: string) {
        this.headers[name] = value;
      }
      send = vi.fn(() => {
        sent.push(this.headers["X-Upload-Id"] ?? "");
        if (Number(this.headers["X-Chunk-Index"]) === 0) {
          this.responseText = JSON.stringify({ complete: true, file: { id: "f1" } });
        }
        queueMicrotask(() => this.onload?.());
      });
      abort = vi.fn(() => this.onabort?.());
    }

    vi.stubGlobal("XMLHttpRequest", MockXHR as unknown as typeof XMLHttpRequest);
    vi.stubGlobal("crypto", {
      randomUUID: () => {
        throw new DOMException(
          "randomUUID can only be used in a secure context",
          "NotAllowedError",
        );
      },
      getRandomValues: (arr: Uint8Array) => {
        arr.fill(0xab);
        return arr;
      },
    });

    const file = new File(
      [new Uint8Array(CHUNKED_UPLOAD_THRESHOLD_BYTES + 1)],
      "big.mp4",
      { type: "video/mp4" },
    );

    await uploadTopicFile("ceremony-videos", file, () => undefined).promise;

    expect(sent.length).toBeGreaterThan(0);
    expect(sent[0]).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });

  it("rejects with UPLOAD_ABORTED when abort is called during chunked upload", async () => {
    class MockXHR {
      upload = { onprogress: null as ((ev: ProgressEvent) => void) | null };
      onabort: (() => void) | null = null;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      status = 200;
      responseText = JSON.stringify({ complete: false });
      open() {}
      setRequestHeader() {}
      send = vi.fn();
      abort = vi.fn(() => this.onabort?.());
    }

    vi.stubGlobal("XMLHttpRequest", MockXHR as unknown as typeof XMLHttpRequest);
    vi.stubGlobal("crypto", {
      randomUUID: () => "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    });

    const file = new File(
      [new Uint8Array(CHUNKED_UPLOAD_THRESHOLD_BYTES + 1)],
      "big.mp4",
      { type: "video/mp4" },
    );
    const { promise, abort } = uploadTopicFile("ceremony-videos", file, () => undefined);
    abort();
    await expect(promise).rejects.toThrow(UPLOAD_ABORTED);
  });
});

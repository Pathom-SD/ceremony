import { afterEach, describe, expect, it, vi } from "vitest";
import { startFormUpload, UPLOAD_ABORTED } from "@/lib/form-upload";

describe("startFormUpload", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects with UPLOAD_ABORTED when abort is called", async () => {
    class MockXHR {
      upload = { onprogress: null as ((ev: ProgressEvent) => void) | null };
      onabort: (() => void) | null = null;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      status = 200;
      responseText = "{}";
      open = vi.fn();
      send = vi.fn();
      abort = vi.fn(() => {
        this.onabort?.();
      });
    }

    const instances: MockXHR[] = [];
    class Xhr extends MockXHR {
      constructor() {
        super();
        instances.push(this);
      }
    }
    vi.stubGlobal("XMLHttpRequest", Xhr as unknown as typeof XMLHttpRequest);

    const fd = new FormData();
    fd.set("file", new File(["x"], "clip.mp4", { type: "video/mp4" }));

    const { promise, abort } = startFormUpload("/api/upload", fd, () => undefined);
    abort();

    await expect(promise).rejects.toThrow(UPLOAD_ABORTED);
    expect(instances[0]?.abort).toHaveBeenCalled();
  });
});

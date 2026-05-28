import { afterEach, describe, expect, it, vi } from "vitest";
import { createUploadId } from "@/lib/upload-id";

describe("createUploadId", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns a UUID when randomUUID is unavailable (non-secure HTTP on LAN IP)", () => {
    vi.stubGlobal("crypto", {
      randomUUID: () => {
        throw new DOMException(
          "randomUUID can only be used in a secure context",
          "NotAllowedError",
        );
      },
      getRandomValues: (arr: Uint8Array) => {
        for (let i = 0; i < arr.length; i += 1) arr[i] = (i * 17) & 0xff;
        return arr;
      },
    });

    const id = createUploadId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
  });
});

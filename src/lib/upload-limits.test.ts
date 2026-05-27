import { describe, expect, it } from "vitest";
import { ceremonyVideosTopic } from "@/lib/ceremony-topics";
import { NEXT_PROXY_MAX_BODY_SIZE } from "@/lib/upload-limits.constants";
import {
  getMaxUploadBytesForTopic,
  isUploadTooLarge,
  MAX_CEREMONY_VIDEO_UPLOAD_BYTES,
} from "@/lib/upload-limits";

const GiB = 1024 ** 3;
const MiB = 1024 ** 2;

describe("ceremony video upload limits", () => {
  it("exposes next.config body size without app module dependencies", () => {
    expect(NEXT_PROXY_MAX_BODY_SIZE).toBe("5gb");
    expect(ceremonyVideosTopic.id).toBe("ceremony-videos");
  });

  it("allows uploads up to 5 GiB on the ceremony-videos topic", () => {
    expect(MAX_CEREMONY_VIDEO_UPLOAD_BYTES).toBe(5 * GiB);
    expect(getMaxUploadBytesForTopic(ceremonyVideosTopic.id)).toBe(5 * GiB);
    expect(isUploadTooLarge(ceremonyVideosTopic.id, 5 * GiB)).toBe(false);
    expect(isUploadTooLarge(ceremonyVideosTopic.id, 5 * GiB + 1)).toBe(true);
  });

  it("keeps non-video topics at 100 MiB", () => {
    expect(getMaxUploadBytesForTopic("lesson-learned")).toBe(100 * MiB);
    expect(isUploadTooLarge("lesson-learned", 100 * MiB)).toBe(false);
    expect(isUploadTooLarge("lesson-learned", 100 * MiB + 1)).toBe(true);
  });
});

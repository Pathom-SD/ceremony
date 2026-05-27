import {
  CEREMONY_VIDEOS_TOPIC_ID,
  MAX_CEREMONY_VIDEO_UPLOAD_BYTES,
  MAX_TOPIC_FILE_UPLOAD_BYTES,
  NEXT_PROXY_MAX_BODY_SIZE,
} from "@/lib/upload-limits.constants";

export {
  CEREMONY_VIDEOS_TOPIC_ID,
  MAX_CEREMONY_VIDEO_UPLOAD_BYTES,
  MAX_TOPIC_FILE_UPLOAD_BYTES,
  NEXT_PROXY_MAX_BODY_SIZE,
};

export function getMaxUploadBytesForTopic(topicId: string): number {
  return topicId === CEREMONY_VIDEOS_TOPIC_ID
    ? MAX_CEREMONY_VIDEO_UPLOAD_BYTES
    : MAX_TOPIC_FILE_UPLOAD_BYTES;
}

export function isUploadTooLarge(topicId: string, byteLength: number): boolean {
  return byteLength > getMaxUploadBytesForTopic(topicId);
}

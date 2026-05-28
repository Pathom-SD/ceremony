import { startFormUpload, UPLOAD_ABORTED } from "@/lib/form-upload";
import { createUploadId } from "@/lib/upload-id";
import {
  CHUNKED_UPLOAD_THRESHOLD_BYTES,
  UPLOAD_CHUNK_SIZE_BYTES,
} from "@/lib/upload-limits.constants";

export { UPLOAD_ABORTED };

export type TopicFileUploadHandle = {
  promise: Promise<void>;
  abort: () => void;
};

function sendChunk(
  url: string,
  uploadId: string,
  file: File,
  chunkIndex: number,
  chunkTotal: number,
  start: number,
  end: number,
  onChunkProgress: (loaded: number) => void,
  isAborted: () => boolean,
  registerAbort: (fn: () => void) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (isAborted()) {
      reject(new Error(UPLOAD_ABORTED));
      return;
    }
    const xhr = new XMLHttpRequest();
    registerAbort(() => xhr.abort());
    const blob = file.slice(start, end);
    xhr.open("POST", url);
    xhr.setRequestHeader("X-Upload-Id", uploadId);
    xhr.setRequestHeader("X-Chunk-Index", String(chunkIndex));
    xhr.setRequestHeader("X-Chunk-Total", String(chunkTotal));
    xhr.setRequestHeader("X-File-Name", encodeURIComponent(file.name));
    xhr.setRequestHeader("X-File-Size", String(file.size));
    xhr.setRequestHeader("Content-Type", "application/octet-stream");
    xhr.upload.onprogress = (ev) => onChunkProgress(ev.loaded);
    xhr.onabort = () => reject(new Error(UPLOAD_ABORTED));
    xhr.onload = () => {
      if (isAborted()) {
        reject(new Error(UPLOAD_ABORTED));
        return;
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      try {
        const j = JSON.parse(xhr.responseText) as { error?: string };
        reject(new Error(j.error ?? "UPLOAD_FAILED"));
      } catch {
        reject(new Error("UPLOAD_FAILED"));
      }
    };
    xhr.onerror = () => reject(new Error("UPLOAD_FAILED"));
    xhr.send(blob);
  });
}

export function uploadTopicFile(
  topicId: string,
  file: File,
  onUploadProgress: (loaded: number, total: number, lengthComputable: boolean) => void,
): TopicFileUploadHandle {
  const url = `/api/topics/${topicId}/files`;
  if (file.size <= CHUNKED_UPLOAD_THRESHOLD_BYTES) {
    const fd = new FormData();
    fd.set("file", file);
    return startFormUpload(url, fd, onUploadProgress);
  }

  const chunksUrl = `${url}/chunks`;
  const uploadId = createUploadId();
  const chunkTotal = Math.ceil(file.size / UPLOAD_CHUNK_SIZE_BYTES);
  let aborted = false;
  let abortCurrent = () => {};

  const promise = (async () => {
    let completedBytes = 0;
    for (let i = 0; i < chunkTotal; i += 1) {
      if (aborted) throw new Error(UPLOAD_ABORTED);
      const start = i * UPLOAD_CHUNK_SIZE_BYTES;
      const end = Math.min(start + UPLOAD_CHUNK_SIZE_BYTES, file.size);
      await sendChunk(
        chunksUrl,
        uploadId,
        file,
        i,
        chunkTotal,
        start,
        end,
        (loaded) => onUploadProgress(completedBytes + loaded, file.size, true),
        () => aborted,
        (fn) => {
          abortCurrent = fn;
        },
      );
      completedBytes = end;
      onUploadProgress(completedBytes, file.size, true);
    }
  })();

  return {
    promise,
    abort: () => {
      aborted = true;
      abortCurrent();
    },
  };
}

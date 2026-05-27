export const UPLOAD_ABORTED = "UPLOAD_ABORTED";

export type FormUploadHandle = {
  promise: Promise<void>;
  abort: () => void;
};

export function startFormUpload(
  url: string,
  formData: FormData,
  onUploadProgress: (loaded: number, total: number, lengthComputable: boolean) => void,
): FormUploadHandle {
  const xhr = new XMLHttpRequest();

  const promise = new Promise<void>((resolve, reject) => {
    xhr.open("POST", url);
    xhr.upload.onprogress = (ev) => {
      onUploadProgress(ev.loaded, ev.total, ev.lengthComputable);
    };
    xhr.onabort = () => reject(new Error(UPLOAD_ABORTED));
    xhr.onload = () => {
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
    xhr.send(formData);
  });

  return {
    promise,
    abort: () => xhr.abort(),
  };
}

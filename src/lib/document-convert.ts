import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { PDF_CACHE_DIR, UPLOADS_DIR } from "./paths";
import { isConvertibleExt, type StoredFileRecord } from "./file-types";

function diskPathFor(record: StoredFileRecord): string {
  return path.join(UPLOADS_DIR, record.topicId, `${record.id}${record.ext}`);
}

export class ConvertError extends Error {
  code: string;
  constructor(code: string, message?: string) {
    super(message ?? code);
    this.code = code;
  }
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

function cachedPdfPath(fileId: string): string {
  return path.join(PDF_CACHE_DIR, `${fileId}.pdf`);
}

let cachedSofficeBinary: string | null = null;

async function locateSoffice(): Promise<string> {
  if (cachedSofficeBinary) return cachedSofficeBinary;

  const envPath = process.env.LIBREOFFICE_PATH?.trim();
  const candidates: string[] = [];
  if (envPath) candidates.push(envPath);

  if (process.platform === "win32") {
    candidates.push(
      "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
      "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
    );
  } else if (process.platform === "darwin") {
    candidates.push("/Applications/LibreOffice.app/Contents/MacOS/soffice");
  } else {
    candidates.push("/usr/bin/soffice", "/usr/bin/libreoffice");
  }

  for (const candidate of candidates) {
    if (await pathExists(candidate)) {
      cachedSofficeBinary = candidate;
      return candidate;
    }
  }

  cachedSofficeBinary = process.platform === "win32" ? "soffice.exe" : "soffice";
  return cachedSofficeBinary;
}

let conversionQueue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const next = conversionQueue.then(task, task);
  conversionQueue = next.catch(() => undefined);
  return next;
}

async function runSoffice(args: string[]): Promise<void> {
  const binary = await locateSoffice();
  await new Promise<void>((resolve, reject) => {
    const child = spawn(binary, args, { windowsHide: true });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (err) => {
      const message = err.message || "";
      if (
        /ENOENT/i.test(message) ||
        /not found/i.test(message) ||
        /not recognized/i.test(message)
      ) {
        reject(new ConvertError("CONVERTER_UNAVAILABLE", message));
      } else {
        reject(new ConvertError("CONVERTER_SPAWN_FAILED", message));
      }
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new ConvertError(
            "CONVERTER_FAILED",
            `soffice exit ${code}: ${stderr.trim()}`,
          ),
        );
      }
    });
  });
}

function gotenbergBaseUrl(): string | null {
  const raw = process.env.GOTENBERG_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}

async function convertWithGotenberg(
  baseUrl: string,
  sourcePath: string,
  destPath: string,
): Promise<void> {
  const buf = await fs.readFile(sourcePath);
  const fileName = path.basename(sourcePath);
  const form = new FormData();
  form.append("files", new Blob([new Uint8Array(buf)]), fileName);

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/forms/libreoffice/convert`, {
      method: "POST",
      body: form,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new ConvertError(
      "CONVERTER_UNAVAILABLE",
      `Gotenberg unreachable: ${msg}`,
    );
  }

  if (!res.ok) {
    const hint = (await res.text()).slice(0, 500);
    throw new ConvertError(
      "CONVERTER_FAILED",
      `Gotenberg HTTP ${res.status}: ${hint}`,
    );
  }

  const out = new Uint8Array(await res.arrayBuffer());
  const head = Buffer.from(out.subarray(0, Math.min(8, out.length))).toString(
    "ascii",
  );
  if (!head.startsWith("%PDF-")) {
    throw new ConvertError(
      "CONVERTER_NO_OUTPUT",
      "Gotenberg returned a non-PDF body (single file must be one PDF)",
    );
  }

  await ensureDir(path.dirname(destPath));
  await fs.writeFile(destPath, out);
}

async function convertWithSoffice(
  sourcePath: string,
  destPath: string,
): Promise<void> {
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "ceremony-conv-"));
  const profileDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "ceremony-lo-profile-"),
  );
  try {
    await runSoffice([
      `-env:UserInstallation=file:///${profileDir.replace(/\\/g, "/")}`,
      "--headless",
      "--norestore",
      "--nologo",
      "--nodefault",
      "--nolockcheck",
      "--convert-to",
      "pdf",
      "--outdir",
      workDir,
      sourcePath,
    ]);

    const sourceBase = path.basename(sourcePath, path.extname(sourcePath));
    const producedPath = path.join(workDir, `${sourceBase}.pdf`);
    if (!(await pathExists(producedPath))) {
      throw new ConvertError(
        "CONVERTER_NO_OUTPUT",
        `LibreOffice did not produce ${producedPath}`,
      );
    }
    await ensureDir(path.dirname(destPath));
    await fs.copyFile(producedPath, destPath);
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
    await fs.rm(profileDir, { recursive: true, force: true }).catch(() => {});
  }
}

export async function ensurePdfForRecord(
  record: StoredFileRecord,
): Promise<string> {
  const ext = record.ext.toLowerCase();
  if (ext === ".pdf") return diskPathFor(record);

  if (!isConvertibleExt(ext)) {
    throw new ConvertError("UNSUPPORTED_EXTENSION", `Cannot convert ${ext}`);
  }

  const targetPath = cachedPdfPath(record.id);
  if (await pathExists(targetPath)) {
    return targetPath;
  }

  const sourcePath = diskPathFor(record);
  if (!(await pathExists(sourcePath))) {
    throw new ConvertError("SOURCE_MISSING", `Missing ${sourcePath}`);
  }

  return enqueue(async () => {
    if (await pathExists(targetPath)) {
      return targetPath;
    }
    const tmpPath = `${targetPath}.${randomUUID()}.tmp`;
    try {
      const gb = gotenbergBaseUrl();
      if (gb) {
        await convertWithGotenberg(gb, sourcePath, tmpPath);
      } else {
        await convertWithSoffice(sourcePath, tmpPath);
      }
      await fs.rename(tmpPath, targetPath);
    } catch (err) {
      await fs.rm(tmpPath, { force: true }).catch(() => {});
      throw err;
    }
    return targetPath;
  });
}

export async function removeCachedPdf(fileId: string): Promise<void> {
  await fs.rm(cachedPdfPath(fileId), { force: true }).catch(() => {});
}

export async function clearPdfCache(): Promise<void> {
  await fs.rm(PDF_CACHE_DIR, { recursive: true, force: true }).catch(() => {});
}

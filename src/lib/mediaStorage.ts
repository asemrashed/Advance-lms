import path from "node:path";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { parseManagedUploadUrl } from "@/lib/managedUploadUrl";
import {
  deleteObject,
  getObjectBuffer,
  headObject,
  isS3Configured,
  putObject,
  s3KeyFromUploadsRelative,
} from "@/lib/s3";

const UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads");

function validateRelativePath(relative: string): boolean {
  const segments = relative.split("/").filter(Boolean);
  return (
    segments.length > 0 &&
    segments.every((s) => s !== "." && s !== ".." && !s.includes("\0"))
  );
}

function resolveLocalPath(relative: string): string | null {
  if (!validateRelativePath(relative)) return null;
  const filePath = path.resolve(UPLOADS_ROOT, relative);
  if (
    filePath !== UPLOADS_ROOT &&
    !filePath.startsWith(`${UPLOADS_ROOT}${path.sep}`)
  ) {
    return null;
  }
  return filePath;
}

/** When S3 is configured, uploads skip VPS disk entirely. */
export function useLocalDisk(): boolean {
  return !isS3Configured();
}

/**
 * Store a file under public/uploads/{folder}/ when local, or lms/{folder}/ on S3.
 * Returns a public S3 URL when on S3, otherwise /uploads/...
 */
export async function persistUploadFile(options: {
  folder: string;
  fileName: string;
  buffer: Buffer;
  contentType: string;
  cacheControl?: string;
}): Promise<{ url: string }> {
  const relative = `${options.folder}/${options.fileName}`;

  if (isS3Configured()) {
    const key = s3KeyFromUploadsRelative(relative);
    const remote = await putObject({
      key,
      body: options.buffer,
      contentType: options.contentType,
      cacheControl:
        options.cacheControl ?? "public, max-age=31536000, immutable",
    });
    return { url: remote.url };
  }

  const dir = path.join(UPLOADS_ROOT, options.folder);
  await mkdir(dir, { recursive: true });
  const filePath = resolveLocalPath(relative);
  if (!filePath) throw new Error("Invalid upload path");
  await writeFile(filePath, options.buffer);
  return { url: `/uploads/${relative}` };
}

/** Auth-gated delivery path for private uploads (assignments, payment proofs). */
export function apiUploadUrl(relative: string): string {
  return `/api/files/uploads/${relative.replace(/^\/+/, "")}`;
}

export async function readUploadFile(
  relative: string,
): Promise<{ buffer: Buffer; contentType?: string } | null> {
  if (!validateRelativePath(relative)) return null;

  const readLocal = async () => {
    const filePath = resolveLocalPath(relative);
    if (!filePath) return null;
    try {
      return { buffer: await readFile(filePath) };
    } catch {
      return null;
    }
  };

  if (useLocalDisk()) {
    return readLocal();
  }

  try {
    const key = s3KeyFromUploadsRelative(relative);
    const buffer = await getObjectBuffer(key);
    if (!buffer) {
      // Fall back to disk when object is missing from S3 (e.g. local-only uploads).
      return readLocal();
    }
    const meta = await headObject(key);
    return { buffer, contentType: meta?.contentType };
  } catch {
    return readLocal();
  }
}

export async function deleteUploadFiles(
  folder: string,
  baseName: string,
  extensions: string[],
): Promise<boolean> {
  let deleted = false;

  for (const ext of extensions) {
    const fileName = ext.startsWith(".")
      ? `${baseName}${ext}`
      : `${baseName}.${ext}`;
    if (await deleteUploadRelative(`${folder}/${fileName}`)) {
      deleted = true;
    }
  }

  return deleted;
}

export async function deleteUploadRelative(relative: string): Promise<boolean> {
  if (!validateRelativePath(relative)) return false;

  let deleted = false;

  if (isS3Configured()) {
    const key = s3KeyFromUploadsRelative(relative);
    const exists = await headObject(key);
    if (exists) {
      await deleteObject(key);
      deleted = true;
    }
  }

  if (useLocalDisk()) {
    const filePath = resolveLocalPath(relative);
    if (filePath) {
      try {
        await unlink(filePath);
        deleted = true;
      } catch {
        // missing file
      }
    }
  }

  return deleted;
}

async function deleteS3Key(key: string): Promise<boolean> {
  const exists = await headObject(key);
  if (!exists) return false;
  await deleteObject(key);
  return true;
}

/** Delete a managed upload by its stored URL (/uploads/..., API path, or our S3 URL). */
export async function deleteUploadByUrl(url: string): Promise<boolean> {
  const parsed = parseManagedUploadUrl(url);
  if (!parsed) return false;

  if (parsed.kind === "s3Key") {
    return deleteS3Key(parsed.key);
  }

  return deleteUploadRelative(parsed.relative);
}

/** Remove a replaced upload when the URL changes (best-effort). */
export async function deleteReplacedUpload(
  oldUrl: string | null | undefined,
  newUrl: string | null | undefined,
): Promise<void> {
  const oldVal = (oldUrl || "").trim();
  const newVal = (newUrl || "").trim();
  if (!oldVal || oldVal === newVal) return;
  try {
    await deleteUploadByUrl(oldVal);
  } catch (error) {
    console.warn("deleteReplacedUpload failed:", oldVal, error);
  }
}

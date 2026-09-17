import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Readable } from "node:stream";

function trimEnv(name: string) {
  return (process.env[name] || "").trim();
}

/** True when real AWS credentials are set (ignores empty / placeholder values). */
export function isS3Configured() {
  const accessKey = trimEnv("AWS_ACCESS_KEY_ID");
  const secretKey = trimEnv("AWS_SECRET_ACCESS_KEY");
  const region = trimEnv("AWS_DEFAULT_REGION");
  const bucket = trimEnv("AWS_S3_BUCKET");
  if (!accessKey || !secretKey || !region || !bucket) return false;

  const looksLikePlaceholder = (value: string) =>
    /^(your_|changeme|todo|xxx|placeholder|<.*>$)/i.test(value) ||
    value === "your_aws_access_key_id" ||
    value === "your_aws_secret_access_key";

  if (looksLikePlaceholder(accessKey) || looksLikePlaceholder(secretKey)) {
    return false;
  }

  return true;
}

let client: S3Client | null = null;

export function getS3Bucket() {
  const bucket = trimEnv("AWS_S3_BUCKET");
  if (!bucket) throw new Error("AWS_S3_BUCKET is not configured");
  return bucket;
}

export function getS3Region() {
  const region = trimEnv("AWS_DEFAULT_REGION");
  if (!region) throw new Error("AWS_DEFAULT_REGION is not configured");
  return region;
}

export function getS3Client() {
  if (!isS3Configured()) {
    throw new Error("AWS S3 is not configured");
  }
  if (!client) {
    client = new S3Client({
      region: getS3Region(),
      credentials: {
        accessKeyId: trimEnv("AWS_ACCESS_KEY_ID"),
        secretAccessKey: trimEnv("AWS_SECRET_ACCESS_KEY"),
      },
    });
  }
  return client;
}

/** Virtual-hosted–style public object URL. */
export function publicObjectUrl(key: string) {
  const bucket = getS3Bucket();
  const region = getS3Region();
  const cleanKey = key.replace(/^\/+/, "");
  return `https://${bucket}.s3.${region}.amazonaws.com/${cleanKey}`;
}

export function isOurS3PublicUrl(url: string) {
  if (!isS3Configured()) return false;
  try {
    const base = publicObjectUrl("").replace(/\/$/, "");
    return url.startsWith(base + "/") || url === base;
  } catch {
    return false;
  }
}

/** Path relative to public/uploads/, e.g. courses/foo.jpg → lms/courses/foo.jpg */
export function s3KeyFromUploadsRelative(relative: string) {
  const clean = relative.replace(/^\/+/, "").replace(/^uploads\//, "");
  return `lms/${clean}`;
}

export function s3CourseImageKey(publicId: string, ext: string) {
  const clean = publicId.replace(/\.[^.]+$/, "").replace(/^\/+/, "");
  const extension = ext.replace(/^\./, "");
  return s3KeyFromUploadsRelative(`courses/${clean}.${extension}`);
}

export function s3PaymentProofKey(publicId: string, ext: string) {
  const clean = publicId.replace(/\.[^.]+$/, "").replace(/^\/+/, "");
  const extension = ext.replace(/^\./, "");
  return s3KeyFromUploadsRelative(`payment-proofs/${clean}.${extension}`);
}

export function s3PdfKey(publicId: string) {
  const clean = publicId.replace(/\.pdf$/i, "").replace(/^\/+/, "");
  return `lms/pdfs/${clean}.pdf`;
}

export function s3MongoBackupKey(isoTimestamp: string) {
  return `backups/mongodb/${isoTimestamp}/mongodb.archive.gz`;
}

export function s3MigrationLogKey(isoTimestamp: string) {
  return `backups/migration/${isoTimestamp}/migration-log.jsonl`;
}

export async function putObject(options: {
  key: string;
  body: Buffer | Uint8Array | Readable;
  contentType?: string;
  cacheControl?: string;
}) {
  const s3 = getS3Client();
  const bucket = getS3Bucket();
  const bodySize =
    Buffer.isBuffer(options.body) || options.body instanceof Uint8Array
      ? options.body.byteLength
      : undefined;

  // Multipart for larger payloads; simple PutObject for small ones.
  if (bodySize !== undefined && bodySize < 5 * 1024 * 1024) {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: options.key,
        Body: options.body,
        ContentType: options.contentType,
        CacheControl: options.cacheControl,
      }),
    );
  } else {
    const upload = new Upload({
      client: s3,
      params: {
        Bucket: bucket,
        Key: options.key,
        Body: options.body,
        ContentType: options.contentType,
        CacheControl: options.cacheControl,
      },
    });
    await upload.done();
  }

  return { key: options.key, url: publicObjectUrl(options.key) };
}

export async function getObjectBuffer(key: string): Promise<Buffer | null> {
  try {
    const s3 = getS3Client();
    const result = await s3.send(
      new GetObjectCommand({
        Bucket: getS3Bucket(),
        Key: key,
      }),
    );
    if (!result.Body) return null;
    const bytes = await result.Body.transformToByteArray();
    return Buffer.from(bytes);
  } catch (error: unknown) {
    const name =
      error && typeof error === "object" && "name" in error
        ? String((error as { name: unknown }).name)
        : "";
    if (name === "NoSuchKey" || name === "NotFound") return null;
    throw error;
  }
}

export async function headObject(key: string): Promise<{
  contentLength: number;
  contentType?: string;
} | null> {
  try {
    const s3 = getS3Client();
    const result = await s3.send(
      new HeadObjectCommand({
        Bucket: getS3Bucket(),
        Key: key,
      }),
    );
    return {
      contentLength: result.ContentLength ?? 0,
      contentType: result.ContentType,
    };
  } catch (error: unknown) {
    const name =
      error && typeof error === "object" && "name" in error
        ? String((error as { name: unknown }).name)
        : "";
    const status =
      error && typeof error === "object" && "$metadata" in error
        ? (error as { $metadata?: { httpStatusCode?: number } }).$metadata
            ?.httpStatusCode
        : undefined;
    if (name === "NotFound" || name === "NoSuchKey" || status === 404) {
      return null;
    }
    throw error;
  }
}

export async function deleteObject(key: string) {
  if (!isS3Configured()) return;
  try {
    const s3 = getS3Client();
    await s3.send(
      new DeleteObjectCommand({
        Bucket: getS3Bucket(),
        Key: key,
      }),
    );
  } catch (error) {
    console.warn("S3 delete failed:", error);
  }
}

export async function getPresignedGetUrl(key: string, expiresInSeconds = 300) {
  const s3 = getS3Client();
  const command = new GetObjectCommand({
    Bucket: getS3Bucket(),
    Key: key,
  });
  return getSignedUrl(s3, command, { expiresIn: expiresInSeconds });
}

export async function listObjectsWithPrefix(prefix: string, maxKeys = 100) {
  const s3 = getS3Client();
  const result = await s3.send(
    new ListObjectsV2Command({
      Bucket: getS3Bucket(),
      Prefix: prefix,
      MaxKeys: maxKeys,
    }),
  );
  return (result.Contents || []).map((item) => ({
    key: item.Key || "",
    size: item.Size ?? 0,
    lastModified: item.LastModified?.toISOString() ?? null,
  }));
}

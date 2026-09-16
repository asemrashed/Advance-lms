/**
 * Migrate /uploads files + Mongo UploadedPdf binaries to S3.
 * Keeps app publicIds unchanged; rewrites Mongo URL strings to public S3 URLs.
 * PDF API URLs (/api/files/pdf/{id}) stay as-is after mirroring bytes to S3.
 *
 * Usage (prefer live site as file source):
 *   npx tsx scripts/migrate-local-to-s3.ts --dry-run --fetch-base=https://nasmatics.com --live-only
 *   npx tsx scripts/migrate-local-to-s3.ts --fetch-base=https://nasmatics.com --live-only
 *
 * Options:
 *   --dry-run          No S3 upload / Mongo rewrite
 *   --skip-backup      Skip pre-migration Mongo backup
 *   --fetch-base=URL   Download missing files from this origin (live site)
 *   --live-only        Do not read public/uploads on this machine; use fetch-base + Mongo only
 */
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { ObjectId } from "mongodb";

function loadEnvFiles() {
  for (const file of [".env.local", ".env.production", ".env"]) {
    const path = join(process.cwd(), file);
    try {
      const text = readFileSync(path, "utf8");
      for (const line of text.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq === -1) continue;
        const key = trimmed.slice(0, eq).trim();
        let value = trimmed.slice(eq + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = value;
      }
    } catch {
      // optional
    }
  }
}

loadEnvFiles();

type WorkItem =
  | {
      type: "url-rewrite";
      collection: string;
      documentId: string;
      fieldPath: string;
      oldUrl: string;
      /** Path relative to public/, e.g. uploads/courses/foo.jpg */
      localRelPath: string;
      s3Key: string;
      publicId: string;
      keepUrlAsIs?: boolean;
      newUrlOverride?: string;
    }
  | {
      type: "uploaded-pdf";
      publicId: string;
      s3Key: string;
      /** Only mirror; no Mongo URL rewrite (API path stays). */
      mirrorOnly: true;
    };

type LogRow = {
  publicId: string;
  oldUrl: string;
  newUrl: string;
  contentType: string;
  sourceSize: number;
  s3Size: number;
  status: "ok" | "skipped" | "failed" | "dry-run";
  error: string;
  collection: string;
  fieldPath: string;
  documentId: string;
  source: "local" | "mongo-pdf" | "remote" | "none";
};

function isLocalhostUrl(url: string) {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return /localhost|127\.0\.0\.1/i.test(url);
  }
}

function parseArgs(argv: string[]) {
  let fetchBase = (
    process.env.MIGRATE_FETCH_BASE ||
    ""
  ).trim().replace(/\/$/, "");

  // Prefer production-like env URLs; ignore localhost defaults from .env.local
  for (const candidate of [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXTAUTH_URL,
  ]) {
    const v = (candidate || "").trim().replace(/\/$/, "");
    if (v && !isLocalhostUrl(v) && !fetchBase) fetchBase = v;
  }

  for (const arg of argv) {
    if (arg.startsWith("--fetch-base=")) {
      fetchBase = arg.slice("--fetch-base=".length).trim().replace(/\/$/, "");
    }
  }

  return {
    dryRun: argv.includes("--dry-run"),
    skipBackup: argv.includes("--skip-backup"),
    liveOnly: argv.includes("--live-only"),
    fetchBase,
  };
}

function isLocalUploadPath(value: unknown): value is string {
  if (typeof value !== "string" || !value) return false;
  const v = value.trim();
  if (v.startsWith("/uploads/")) return true;
  if (v.startsWith("/api/files/uploads/")) return true;
  if (v.startsWith("/api/files/image/")) return true;
  if (v.includes("/uploads/")) {
    try {
      const u = new URL(v);
      return (
        u.pathname.startsWith("/uploads/") ||
        u.pathname.startsWith("/api/files/uploads/") ||
        u.pathname.startsWith("/api/files/image/")
      );
    } catch {
      return false;
    }
  }
  return false;
}

function isApiPdfUrl(value: unknown): value is string {
  if (typeof value !== "string") return false;
  return (
    value.startsWith("/api/files/pdf/") ||
    /\/api\/files\/pdf\//.test(value)
  );
}

function normalizeToUploadsPath(url: string): string | null {
  let path = url.trim();
  try {
    if (/^https?:\/\//i.test(path)) {
      path = new URL(path).pathname;
    }
  } catch {
    return null;
  }
  if (path.startsWith("/api/files/uploads/")) {
    return `/uploads/${path.slice("/api/files/uploads/".length)}`;
  }
  if (path.startsWith("/api/files/image/")) {
    return `/uploads/${path.slice("/api/files/image/".length)}`;
  }
  if (path.startsWith("/uploads/")) return path;
  return null;
}

function extractPdfPublicId(url: string): string | null {
  const m = url.match(/\/api\/files\/pdf\/([^/?#]+)/);
  if (m) return decodeURIComponent(m[1]);
  const m2 = url.match(/\/uploads\/pdf\/([^/?#]+?)(?:\.pdf)?$/i);
  if (m2) return decodeURIComponent(m2[1].replace(/\.pdf$/i, ""));
  return null;
}

/** /uploads/foo/bar.jpg → lms/foo/bar.jpg */
function uploadsPathToS3Key(uploadsPath: string): string {
  const rel = uploadsPath.replace(/^\/uploads\//, "").replace(/^\/+/, "");
  // Normalize pdf folder name to match existing S3 convention
  if (rel.startsWith("pdf/")) {
    const file = rel.slice("pdf/".length);
    const clean = file.replace(/\.pdf$/i, "");
    return `lms/pdfs/${clean}.pdf`;
  }
  return `lms/${rel}`;
}

function guessContentType(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".mp4")) return "video/mp4";
  if (lower.endsWith(".webm")) return "video/webm";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return "application/octet-stream";
}

function fieldPathToMongoSetKey(fieldPath: string): string {
  return fieldPath.replace(/\[(\d+)\]/g, ".$1");
}

function walkStrings(
  value: unknown,
  path: string,
  visit: (fieldPath: string, str: string) => void,
) {
  if (typeof value === "string") {
    visit(path, value);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => walkStrings(item, `${path}[${i}]`, visit));
    return;
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (k === "data") continue; // skip binary blobs
      walkStrings(v, path ? `${path}.${k}` : k, visit);
    }
  }
}

function toNodeBuffer(data: unknown): Buffer | null {
  if (!data) return null;
  if (Buffer.isBuffer(data)) return data;
  if (data instanceof Uint8Array) return Buffer.from(data);
  if (typeof data === "object" && data !== null) {
    const maybe = data as {
      type?: unknown;
      data?: unknown;
      buffer?: ArrayBuffer | SharedArrayBuffer | Buffer;
      value?: () => Buffer;
    };
    if (maybe.type === "Buffer" && Array.isArray(maybe.data)) {
      return Buffer.from(maybe.data as number[]);
    }
    if (typeof maybe.value === "function") {
      try {
        const v = maybe.value();
        if (Buffer.isBuffer(v)) return v;
      } catch {
        // ignore
      }
    }
    if (maybe.buffer) {
      return Buffer.from(maybe.buffer);
    }
  }
  return null;
}

async function rewriteDocument(
  db: import("mongodb").Db,
  collection: string,
  documentId: string,
  fieldPath: string,
  newUrl: string,
) {
  const col = db.collection(collection);
  const _id = ObjectId.isValid(documentId)
    ? new ObjectId(documentId)
    : documentId;
  const mongoKey = fieldPathToMongoSetKey(fieldPath);
  const result = await col.updateOne({ _id }, { $set: { [mongoKey]: newUrl } });
  if (result.matchedCount === 0) {
    throw new Error("Document not found for rewrite");
  }
}

async function main() {
  const { dryRun, skipBackup, fetchBase, liveOnly } = parseArgs(
    process.argv.slice(2),
  );

  const { default: connectDB } = await import("../src/lib/mongodb");
  const {
    isS3Configured,
    putObject,
    headObject,
    publicObjectUrl,
    isOurS3PublicUrl,
    s3PdfKey,
    s3MigrationLogKey,
  } = await import("../src/lib/s3");
  const { createAndStoreMongoBackup } = await import("../src/lib/mongoBackup");

  if (!isS3Configured()) {
    throw new Error("AWS S3 is not configured (AWS_* env vars required)");
  }

  if (liveOnly && !fetchBase) {
    throw new Error(
      "--live-only requires --fetch-base=https://your-live-site.com",
    );
  }

  const mongoose = await connectDB();
  const db = mongoose.connection.db;
  if (!db) throw new Error("No Mongo db handle");

  const iso = new Date().toISOString().replace(/[:.]/g, "-");
  const logDir = join(process.cwd(), "backups-local", "migration-local", iso);
  mkdirSync(logDir, { recursive: true });
  const logFile = join(logDir, "migration-log.jsonl");

  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
  console.log(`Log file: ${logFile}`);
  if (fetchBase) {
    console.log(
      `Fetch base: ${fetchBase}${liveOnly ? " (live-only — skipping local disk)" : ""}`,
    );
  } else {
    console.log(
      "No fetch base — using local disk + Mongo only (pass --fetch-base=https://nasmatics.com --live-only)",
    );
  }

  if (!skipBackup && !dryRun) {
    console.log("Creating pre-migration Mongo backup…");
    const backup = await createAndStoreMongoBackup({ uploadToS3: true });
    console.log(
      `Pre-backup S3 key: ${backup.key} (${backup.format}, ${backup.size} bytes)`,
    );
    writeFileSync(
      join(logDir, "pre-backup-meta.json"),
      JSON.stringify(backup, (k, v) => (k === "buffer" ? undefined : v), 2),
    );
  } else if (dryRun) {
    console.log("Dry-run: skipping pre-backup.");
  } else {
    console.log("Skipping pre-backup (--skip-backup).");
  }

  const work: WorkItem[] = [];
  const seen = new Set<string>();

  function pushWork(item: WorkItem) {
    const key =
      item.type === "uploaded-pdf"
        ? `pdf:${item.publicId}`
        : `url:${item.collection}:${item.documentId}:${item.fieldPath}:${item.oldUrl}`;
    if (seen.has(key)) return;
    seen.add(key);
    work.push(item);
  }

  console.log("Discovering /uploads URL references…");
  const collections = await db.listCollections().toArray();
  for (const colInfo of collections) {
    const colName = colInfo.name;
    if (colName.startsWith("system.")) continue;
    // Skip binary-heavy collection for string walk; handled separately
    if (colName.toLowerCase() === "uploadedpdfs") continue;

    const col = db.collection(colName);
    const cursor = col.find({});
    for await (const doc of cursor) {
      walkStrings(doc, "", (fieldPath, str) => {
        if (fieldPath === "_id" || fieldPath.endsWith(".data")) return;

        if (isOurS3PublicUrl(str)) return;

        if (isApiPdfUrl(str)) {
          const publicId = extractPdfPublicId(str);
          if (!publicId) return;
          pushWork({
            type: "uploaded-pdf",
            publicId,
            s3Key: s3PdfKey(publicId),
            mirrorOnly: true,
          });
          return;
        }

        if (!isLocalUploadPath(str)) return;
        const uploadsPath = normalizeToUploadsPath(str);
        if (!uploadsPath) return;

        const s3Key = uploadsPathToS3Key(uploadsPath);
        const fileName = uploadsPath.split("/").pop() || "";
        const publicId = fileName.replace(/\.[^.]+$/, "");
        const localRelPath = uploadsPath.replace(/^\//, ""); // uploads/...

        // /uploads/pdf/... → mirror + rewrite to API pdf URL (stable across hosts)
        if (uploadsPath.startsWith("/uploads/pdf/")) {
          const pdfId = extractPdfPublicId(uploadsPath) || publicId;
          pushWork({
            type: "url-rewrite",
            collection: colName,
            documentId: String(doc._id),
            fieldPath,
            oldUrl: str,
            localRelPath,
            s3Key: s3PdfKey(pdfId),
            publicId: pdfId,
            newUrlOverride: `/api/files/pdf/${encodeURIComponent(pdfId)}`,
          });
          return;
        }

        pushWork({
          type: "url-rewrite",
          collection: colName,
          documentId: String(doc._id),
          fieldPath,
          oldUrl: str,
          localRelPath,
          s3Key,
          publicId,
        });
      });
    }
  }

  console.log("Discovering UploadedPdf documents…");
  const pdfColName =
    collections.find((c) => c.name.toLowerCase() === "uploadedpdfs")?.name ||
    "uploadedpdfs";
  if (collections.some((c) => c.name === pdfColName)) {
    const pdfCol = db.collection(pdfColName);
    const cursor = pdfCol.find({}, { projection: { publicId: 1 } });
    for await (const doc of cursor) {
      const publicId = (doc as { publicId?: string }).publicId;
      if (!publicId) continue;
      pushWork({
        type: "uploaded-pdf",
        publicId,
        s3Key: s3PdfKey(publicId),
        mirrorOnly: true,
      });
    }
  }

  console.log(`Found ${work.length} work item(s).`);

  const summary = { ok: 0, skipped: 0, failed: 0, dryRun: 0 };
  const logRows: LogRow[] = [];
  const uploadsRoot = join(process.cwd(), "public");

  async function tryFetchRemote(
    urls: string[],
    fallbackContentType: string,
  ): Promise<{
    buffer: Buffer;
    contentType: string;
    source: "remote";
  } | null> {
    if (!fetchBase) return null;
    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (!res.ok) continue;
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length === 0) continue;
        return {
          buffer: buf,
          contentType: res.headers.get("content-type") || fallbackContentType,
          source: "remote",
        };
      } catch {
        // try next
      }
    }
    return null;
  }

  async function loadBytes(item: WorkItem): Promise<{
    buffer: Buffer;
    contentType: string;
    source: "local" | "mongo-pdf" | "remote";
  } | null> {
    const allowLocal = !liveOnly;

    if (item.type === "uploaded-pdf") {
      const remoteUrls = fetchBase
        ? [
            `${fetchBase}/api/files/pdf/${encodeURIComponent(item.publicId)}`,
            `${fetchBase}/uploads/pdf/${item.publicId}.pdf`,
          ]
        : [];

      // Live-first when fetch base is set
      if (fetchBase && (liveOnly || !isLocalhostUrl(fetchBase))) {
        const remote = await tryFetchRemote(remoteUrls, "application/pdf");
        if (remote) return remote;
      }

      if (allowLocal) {
        const localPath = join(
          uploadsRoot,
          "uploads",
          "pdf",
          `${item.publicId}.pdf`,
        );
        if (existsSync(localPath)) {
          return {
            buffer: readFileSync(localPath),
            contentType: "application/pdf",
            source: "local",
          };
        }
      }

      const row = await db
        .collection(pdfColName)
        .findOne({ publicId: item.publicId }, { projection: { data: 1 } });
      const buffer = toNodeBuffer(row?.data);
      if (buffer && buffer.length > 0) {
        return { buffer, contentType: "application/pdf", source: "mongo-pdf" };
      }

      // Last chance remote (e.g. localhost fetch base or after mongo miss)
      const remote = await tryFetchRemote(remoteUrls, "application/pdf");
      if (remote) return remote;
      return null;
    }

    // url-rewrite
    const uploadsPath = `/${item.localRelPath}`;
    const remoteCandidates = fetchBase
      ? [
          ...(item.s3Key.startsWith("lms/pdfs/")
            ? [
                `${fetchBase}/api/files/pdf/${encodeURIComponent(item.publicId)}`,
              ]
            : []),
          `${fetchBase}/api/files/uploads/${item.localRelPath.replace(/^uploads\//, "")}`,
          `${fetchBase}/api/files/image/${item.localRelPath.replace(/^uploads\//, "")}`,
          `${fetchBase}${uploadsPath}`,
        ]
      : [];

    if (fetchBase && (liveOnly || !isLocalhostUrl(fetchBase))) {
      const remote = await tryFetchRemote(
        remoteCandidates,
        guessContentType(item.localRelPath),
      );
      if (remote) return remote;
    }

    if (allowLocal) {
      const localPath = join(uploadsRoot, item.localRelPath);
      if (existsSync(localPath)) {
        return {
          buffer: readFileSync(localPath),
          contentType: guessContentType(item.localRelPath),
          source: "local",
        };
      }
    }

    if (item.s3Key.startsWith("lms/pdfs/")) {
      const row = await db
        .collection(pdfColName)
        .findOne({ publicId: item.publicId }, { projection: { data: 1 } });
      const buffer = toNodeBuffer(row?.data);
      if (buffer && buffer.length > 0) {
        return { buffer, contentType: "application/pdf", source: "mongo-pdf" };
      }
    }

    const remote = await tryFetchRemote(
      remoteCandidates,
      guessContentType(item.localRelPath),
    );
    if (remote) return remote;
    return null;
  }

  for (const item of work) {
    const row: LogRow = {
      publicId: item.type === "uploaded-pdf" ? item.publicId : item.publicId,
      oldUrl: item.type === "url-rewrite" ? item.oldUrl : `UploadedPdf:${item.publicId}`,
      newUrl: "",
      contentType: "",
      sourceSize: 0,
      s3Size: 0,
      status: "failed",
      error: "",
      collection:
        item.type === "url-rewrite" ? item.collection : pdfColName,
      fieldPath: item.type === "url-rewrite" ? item.fieldPath : "data",
      documentId:
        item.type === "url-rewrite" ? item.documentId : item.publicId,
      source: "none",
    };

    try {
      const loaded = await loadBytes(item);
      if (!loaded) {
        throw new Error(
          item.type === "url-rewrite"
            ? `Missing file for ${item.oldUrl} (live fetch + local + Mongo all failed)`
            : `Missing PDF bytes for publicId=${item.publicId}`,
        );
      }
      row.source = loaded.source;
      row.contentType = loaded.contentType;
      row.sourceSize = loaded.buffer.length;

      const newUrl =
        item.type === "url-rewrite"
          ? item.newUrlOverride || publicObjectUrl(item.s3Key)
          : publicObjectUrl(item.s3Key);

      // Idempotent: if rewriting and already S3, skip
      if (
        item.type === "url-rewrite" &&
        isOurS3PublicUrl(item.oldUrl) &&
        !item.newUrlOverride
      ) {
        row.status = "skipped";
        row.error = "already S3 URL";
        row.newUrl = item.oldUrl;
        summary.skipped += 1;
        logRows.push(row);
        appendFileSync(logFile, JSON.stringify(row) + "\n");
        continue;
      }

      // For mirror-only PDFs, skip upload if HeadObject already matches size
      const existing = await headObject(item.s3Key);
      if (existing && existing.contentLength === loaded.buffer.length) {
        if (item.type === "uploaded-pdf") {
          row.status = "skipped";
          row.error = "already on S3 with matching size";
          row.newUrl = publicObjectUrl(item.s3Key);
          row.s3Size = existing.contentLength;
          summary.skipped += 1;
          logRows.push(row);
          appendFileSync(logFile, JSON.stringify(row) + "\n");
          continue;
        }
      }

      if (dryRun) {
        row.status = "dry-run";
        row.newUrl =
          item.type === "url-rewrite"
            ? item.newUrlOverride || publicObjectUrl(item.s3Key)
            : `(mirror) ${publicObjectUrl(item.s3Key)}`;
        row.error = `would upload to s3://${item.s3Key} from ${loaded.source}`;
        summary.dryRun += 1;
        console.log(
          `[dry-run] ${item.s3Key} ← ${loaded.source} (${loaded.buffer.length} bytes)`,
        );
        logRows.push(row);
        appendFileSync(logFile, JSON.stringify(row) + "\n");
        continue;
      }

      await putObject({
        key: item.s3Key,
        body: loaded.buffer,
        contentType: loaded.contentType,
        cacheControl: item.s3Key.includes("payment-proofs")
          ? "private, max-age=86400"
          : "public, max-age=31536000, immutable",
      });

      const head = await headObject(item.s3Key);
      if (!head) throw new Error("HeadObject null after upload");
      row.s3Size = head.contentLength;
      if (head.contentLength !== loaded.buffer.length) {
        throw new Error(
          `Size mismatch: source ${loaded.buffer.length} vs S3 ${head.contentLength}`,
        );
      }

      if (item.type === "url-rewrite") {
        await rewriteDocument(
          db,
          item.collection,
          item.documentId,
          item.fieldPath,
          newUrl,
        );
        row.newUrl = newUrl;
      } else {
        row.newUrl = publicObjectUrl(item.s3Key);
      }

      row.status = "ok";
      summary.ok += 1;
      console.log(`[ok] ${item.s3Key}`);
    } catch (error) {
      row.status = "failed";
      row.error = error instanceof Error ? error.message : String(error);
      summary.failed += 1;
      console.error(`[fail] ${row.publicId || row.oldUrl}: ${row.error}`);
    }

    logRows.push(row);
    appendFileSync(logFile, JSON.stringify(row) + "\n");
  }

  if (!dryRun && logRows.length > 0) {
    try {
      const logBody = Buffer.from(
        logRows.map((r) => JSON.stringify(r)).join("\n") + "\n",
        "utf8",
      );
      const key = s3MigrationLogKey(`local-${iso}`);
      await putObject({
        key,
        body: logBody,
        contentType: "application/x-ndjson",
        cacheControl: "private, no-store",
      });
      console.log(`Migration log uploaded: ${key}`);
    } catch (error) {
      console.warn("Failed to upload migration log to S3:", error);
    }
  }

  writeFileSync(
    join(logDir, "summary.json"),
    JSON.stringify({ iso, dryRun, summary, total: work.length }, null, 2),
  );

  console.log("\nSummary:", summary);
  console.log(
    "Note: Unsplash/external HTTPS URLs are left unchanged. Prefer --fetch-base=https://nasmatics.com --live-only for production files.",
  );
  if (summary.failed > 0) process.exitCode = 1;

  await mongoose.disconnect();
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      const mongoose = await import("mongoose");
      if (mongoose.default.connection.readyState !== 0) {
        await mongoose.default.disconnect();
      }
    } catch {
      // ignore
    }
    process.exit(process.exitCode ?? 0);
  });

/**
 * Migrate Cloudinary-hosted media to S3 without changing app IDs.
 *
 * Sequence: pre-backup → discover → download exact URL → S3 key from stable
 * app/public lms path (not transform segments) → PutObject → HeadObject verify
 * → rewrite Mongo → migration log.
 *
 * Usage:
 *   npx tsx scripts/migrate-cloudinary-to-s3.ts --dry-run
 *   npx tsx scripts/migrate-cloudinary-to-s3.ts
 *   npx tsx scripts/migrate-cloudinary-to-s3.ts --skip-backup
 */
import { readFileSync, writeFileSync, appendFileSync, mkdirSync } from "node:fs";
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

type AssetKind = "courses" | "payment-proofs" | "pdfs" | "other";

type DiscoveryHit = {
  collection: string;
  documentId: string;
  fieldPath: string;
  oldUrl: string;
  /** Preferred app publicId when known from a sibling field. */
  appPublicId?: string;
  kind: AssetKind;
  /** When true, keep Mongo value as /api/files/pdf/{id} after mirroring to S3. */
  keepApiPdfUrl?: boolean;
  arrayIndex?: number;
};

type LogRow = {
  publicId: string;
  oldUrl: string;
  newUrl: string;
  contentType: string;
  cloudinarySize: number;
  s3Size: number;
  status: "ok" | "skipped" | "failed" | "dry-run";
  error: string;
  collection: string;
  fieldPath: string;
  documentId: string;
};

function isCloudinaryUrl(value: unknown): value is string {
  if (typeof value !== "string" || !value) return false;
  try {
    const u = new URL(value);
    return (
      u.protocol === "https:" &&
      (u.hostname.includes("cloudinary.com") ||
        u.hostname.includes("cloudinary"))
    );
  } catch {
    return false;
  }
}

/**
 * Extract S3 key from Cloudinary delivery URL by locating the logical
 * `/lms/...` public_id path — never treat transform/version segments as the key.
 */
function extractLmsKeyFromCloudinaryUrl(url: string): string | null {
  let pathname: string;
  try {
    pathname = decodeURIComponent(new URL(url).pathname);
  } catch {
    return null;
  }
  const markers = [
    "/lms/courses/",
    "/lms/payment-proofs/",
    "/lms/pdfs/",
  ] as const;
  for (const marker of markers) {
    const idx = pathname.indexOf(marker);
    if (idx !== -1) {
      return pathname.slice(idx + 1); // drop leading "/"
    }
  }
  // Fallback: any /lms/ segment after /upload/
  const uploadIdx = pathname.indexOf("/upload/");
  if (uploadIdx !== -1) {
    const after = pathname.slice(uploadIdx + "/upload/".length);
    const lmsIdx = after.indexOf("lms/");
    if (lmsIdx !== -1) {
      return after.slice(lmsIdx);
    }
  }
  return null;
}

function kindFromKey(key: string): AssetKind {
  if (key.startsWith("lms/courses/")) return "courses";
  if (key.startsWith("lms/payment-proofs/")) return "payment-proofs";
  if (key.startsWith("lms/pdfs/")) return "pdfs";
  return "other";
}

function leafPublicIdFromKey(key: string): string {
  const base = key.split("/").pop() || key;
  return base.replace(/\.[^.]+$/, "");
}

function guessExtFromContentType(contentType: string, url: string): string {
  const ct = contentType.toLowerCase();
  if (ct.includes("png")) return "png";
  if (ct.includes("webp")) return "webp";
  if (ct.includes("gif")) return "gif";
  if (ct.includes("pdf")) return "pdf";
  if (ct.includes("jpeg") || ct.includes("jpg")) return "jpg";
  const path = (() => {
    try {
      return new URL(url).pathname.toLowerCase();
    } catch {
      return url.toLowerCase();
    }
  })();
  for (const ext of ["png", "webp", "gif", "pdf", "jpg", "jpeg"]) {
    if (path.endsWith(`.${ext}`)) return ext === "jpeg" ? "jpg" : ext;
  }
  return "jpg";
}

function buildS3Key(hit: DiscoveryHit, contentType: string): string {
  if (hit.appPublicId) {
    const id = hit.appPublicId.replace(/\.[^.]+$/, "");
    if (hit.kind === "pdfs" || hit.keepApiPdfUrl) {
      return `lms/pdfs/${id}.pdf`;
    }
    if (hit.kind === "payment-proofs") {
      const ext = guessExtFromContentType(contentType, hit.oldUrl);
      return `lms/payment-proofs/${id}.${ext}`;
    }
    if (hit.kind === "courses") {
      const ext = guessExtFromContentType(contentType, hit.oldUrl);
      return `lms/courses/${id}.${ext}`;
    }
  }

  const fromUrl = extractLmsKeyFromCloudinaryUrl(hit.oldUrl);
  if (fromUrl) return fromUrl;

  // Last resort: hash-free leaf from URL path final segment
  try {
    const leaf = decodeURIComponent(new URL(hit.oldUrl).pathname)
      .split("/")
      .filter(Boolean)
      .pop();
    if (leaf) {
      const folder =
        hit.kind === "payment-proofs"
          ? "lms/payment-proofs"
          : hit.kind === "pdfs"
            ? "lms/pdfs"
            : "lms/courses";
      return `${folder}/${leaf}`;
    }
  } catch {
    // ignore
  }
  throw new Error("Could not determine stable S3 key");
}

function pushHit(
  hits: DiscoveryHit[],
  hit: DiscoveryHit,
  seen: Set<string>,
) {
  const dedupe = `${hit.collection}:${hit.documentId}:${hit.fieldPath}:${hit.oldUrl}`;
  if (seen.has(dedupe)) return;
  seen.add(dedupe);
  hits.push(hit);
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
      walkStrings(v, path ? `${path}.${k}` : k, visit);
    }
  }
}

async function discoverHits(db: import("mongodb").Db): Promise<DiscoveryHit[]> {
  const hits: DiscoveryHit[] = [];
  const seen = new Set<string>();

  const simpleScans: {
    collection: string;
    fields: { path: string; kind: AssetKind }[];
  }[] = [
    {
      collection: "courses",
      fields: [{ path: "thumbnailUrl", kind: "courses" }],
    },
    {
      collection: "batches",
      fields: [{ path: "thumbnailUrl", kind: "courses" }],
    },
    {
      collection: "blogposts",
      fields: [{ path: "thumbnailUrl", kind: "courses" }],
    },
    {
      collection: "pastpapers",
      fields: [
        { path: "questionPaperUrl", kind: "pdfs" },
        { path: "marksPdfUrl", kind: "pdfs" },
        { path: "workSolutionUrl", kind: "pdfs" },
      ],
    },
    {
      collection: "lessons",
      fields: [{ path: "pdfUrl", kind: "pdfs" }],
    },
    {
      collection: "resourceworksheets",
      fields: [{ path: "pdfUrl", kind: "pdfs" }],
    },
    {
      collection: "resourcenotes",
      fields: [{ path: "pdfUrl", kind: "pdfs" }],
    },
    {
      collection: "platformquestions",
      fields: [
        { path: "diagramUrl", kind: "courses" },
        { path: "msDiagramUrl", kind: "courses" },
      ],
    },
  ];

  // Resolve actual collection names (Mongoose pluralization can vary).
  const existing = new Set(
    (await db.listCollections().toArray()).map((c) => c.name),
  );

  function resolveCollection(preferred: string): string | null {
    if (existing.has(preferred)) return preferred;
    const lower = preferred.toLowerCase();
    for (const name of existing) {
      if (name.toLowerCase() === lower) return name;
    }
    return null;
  }

  for (const scan of simpleScans) {
    const colName = resolveCollection(scan.collection);
    if (!colName) continue;
    const col = db.collection(colName);
    for (const field of scan.fields) {
      const filter = { [field.path]: { $regex: "cloudinary", $options: "i" } };
      const cursor = col.find(filter).project({
        [field.path]: 1,
        pdfPublicId: 1,
        publicId: 1,
      });
      for await (const doc of cursor) {
        const url = (doc as Record<string, unknown>)[field.path];
        if (!isCloudinaryUrl(url)) continue;
        const pdfPublicId = (doc as { pdfPublicId?: string }).pdfPublicId;
        const keepApi =
          field.kind === "pdfs" &&
          typeof pdfPublicId === "string" &&
          pdfPublicId.length > 0;
        pushHit(
          hits,
          {
            collection: colName,
            documentId: String(doc._id),
            fieldPath: field.path,
            oldUrl: url,
            appPublicId: keepApi ? pdfPublicId : undefined,
            kind: field.kind,
            keepApiPdfUrl: keepApi,
          },
          seen,
        );
      }
    }
  }

  // Enrollment proofs (array)
  {
    const colName = resolveCollection("enrollmentrequests");
    if (colName) {
      const col = db.collection(colName);
      const cursor = col.find({
        proofUrls: { $elemMatch: { $regex: "cloudinary", $options: "i" } },
      });
      for await (const doc of cursor) {
        const urls = (doc as { proofUrls?: unknown }).proofUrls;
        if (!Array.isArray(urls)) continue;
        urls.forEach((url, index) => {
          if (!isCloudinaryUrl(url)) return;
          pushHit(
            hits,
            {
              collection: colName,
              documentId: String(doc._id),
              fieldPath: `proofUrls[${index}]`,
              oldUrl: url,
              kind: "payment-proofs",
              arrayIndex: index,
            },
            seen,
          );
        });
      }
    }
  }

  // Nested attachments on lessons / assignments / submissions
  const nestedCollections = [
    "lessons",
    "assignments",
    "assignmentsubmissions",
    "sitecontents",
    "settings",
  ];
  for (const preferred of nestedCollections) {
    const colName = resolveCollection(preferred);
    if (!colName) continue;
    const col = db.collection(colName);
    const cursor = col.find({});
    for await (const doc of cursor) {
      walkStrings(doc, "", (fieldPath, str) => {
        if (!isCloudinaryUrl(str)) return;
        // Skip _id and non-url-ish paths already covered
        if (fieldPath === "_id") return;
        const key = extractLmsKeyFromCloudinaryUrl(str);
        const kind = key ? kindFromKey(key) : "other";
        pushHit(
          hits,
          {
            collection: colName,
            documentId: String(doc._id),
            fieldPath,
            oldUrl: str,
            kind,
            appPublicId: key ? leafPublicIdFromKey(key) : undefined,
          },
          seen,
        );
      });
    }
  }

  return hits;
}

/** Convert `a.b[0].c` / `proofUrls[1]` to Mongo dotted path `a.b.0.c`. */
function fieldPathToMongoSetKey(fieldPath: string): string {
  return fieldPath.replace(/\[(\d+)\]/g, ".$1");
}

async function rewriteDocument(
  db: import("mongodb").Db,
  hit: DiscoveryHit,
  newUrl: string,
) {
  const col = db.collection(hit.collection);
  const _id = ObjectId.isValid(hit.documentId)
    ? new ObjectId(hit.documentId)
    : hit.documentId;

  const mongoKey = fieldPathToMongoSetKey(hit.fieldPath);
  const result = await col.updateOne({ _id }, { $set: { [mongoKey]: newUrl } });
  if (result.matchedCount === 0) {
    throw new Error("Document not found for rewrite");
  }
}

function parseArgs(argv: string[]) {
  return {
    dryRun: argv.includes("--dry-run"),
    skipBackup: argv.includes("--skip-backup"),
  };
}

async function main() {
  const { dryRun, skipBackup } = parseArgs(process.argv.slice(2));

  const { default: connectDB } = await import("../src/lib/mongodb");
  const {
    isS3Configured,
    putObject,
    headObject,
    publicObjectUrl,
    isOurS3PublicUrl,
    s3MigrationLogKey,
  } = await import("../src/lib/s3");
  const { createAndStoreMongoBackup } = await import("../src/lib/mongoBackup");

  if (!isS3Configured()) {
    throw new Error("AWS S3 is not configured (AWS_* env vars required)");
  }

  const mongoose = await connectDB();
  const db = mongoose.connection.db;
  if (!db) throw new Error("No Mongo db handle");

  const iso = new Date().toISOString().replace(/[:.]/g, "-");
  const logDir = join(process.cwd(), "backups-local", "migration", iso);
  mkdirSync(logDir, { recursive: true });
  const logFile = join(logDir, "migration-log.jsonl");

  console.log(`Mode: ${dryRun ? "DRY RUN" : "LIVE"}`);
  console.log(`Log file: ${logFile}`);

  if (!skipBackup && !dryRun) {
    console.log("Creating pre-migration Mongo backup…");
    const backup = await createAndStoreMongoBackup({ uploadToS3: true });
    console.log(`Pre-backup S3 key: ${backup.key} (${backup.format}, ${backup.size} bytes)`);
    writeFileSync(
      join(logDir, "pre-backup-meta.json"),
      JSON.stringify(backup, (k, v) => (k === "buffer" ? undefined : v), 2),
    );
  } else if (dryRun && !skipBackup) {
    console.log("Dry-run: skipping pre-backup (pass without --dry-run to create one).");
  } else {
    console.log("Skipping pre-backup (--skip-backup).");
  }

  console.log("Discovering Cloudinary URLs…");
  const hits = await discoverHits(db);
  console.log(`Found ${hits.length} Cloudinary reference(s).`);

  const summary = { ok: 0, skipped: 0, failed: 0, dryRun: 0 };
  const logRows: LogRow[] = [];

  for (const hit of hits) {
    const row: LogRow = {
      publicId: hit.appPublicId || "",
      oldUrl: hit.oldUrl,
      newUrl: "",
      contentType: "",
      cloudinarySize: 0,
      s3Size: 0,
      status: "failed",
      error: "",
      collection: hit.collection,
      fieldPath: hit.fieldPath,
      documentId: hit.documentId,
    };

    try {
      if (isOurS3PublicUrl(hit.oldUrl)) {
        row.status = "skipped";
        row.error = "already on our S3 bucket";
        row.newUrl = hit.oldUrl;
        summary.skipped += 1;
        logRows.push(row);
        appendFileSync(logFile, JSON.stringify(row) + "\n");
        continue;
      }

      const response = await fetch(hit.oldUrl);
      if (!response.ok) {
        throw new Error(`Download failed HTTP ${response.status}`);
      }
      const contentType =
        response.headers.get("content-type") || "application/octet-stream";
      const buffer = Buffer.from(await response.arrayBuffer());
      row.contentType = contentType;
      row.cloudinarySize = buffer.length;

      const key = buildS3Key(hit, contentType);
      row.publicId = leafPublicIdFromKey(key);

      const newUrl = hit.keepApiPdfUrl
        ? `/api/files/pdf/${encodeURIComponent(hit.appPublicId!)}`
        : publicObjectUrl(key);

      if (dryRun) {
        row.status = "dry-run";
        row.newUrl = newUrl;
        row.error = `would upload to s3://${key}`;
        summary.dryRun += 1;
        logRows.push(row);
        appendFileSync(logFile, JSON.stringify(row) + "\n");
        console.log(`[dry-run] ${hit.collection}.${hit.fieldPath} → ${key}`);
        continue;
      }

      await putObject({
        key,
        body: buffer,
        contentType,
        cacheControl:
          hit.kind === "payment-proofs"
            ? "private, max-age=86400"
            : "public, max-age=31536000, immutable",
      });

      const head = await headObject(key);
      if (!head) {
        throw new Error("HeadObject returned null after upload");
      }
      row.s3Size = head.contentLength;
      if (head.contentLength !== buffer.length) {
        throw new Error(
          `Size mismatch: downloaded ${buffer.length} vs S3 ${head.contentLength}`,
        );
      }

      await rewriteDocument(db, hit, newUrl);
      row.newUrl = newUrl;
      row.status = "ok";
      summary.ok += 1;
      console.log(`[ok] ${hit.collection}.${hit.fieldPath} → ${newUrl}`);
    } catch (error) {
      row.status = "failed";
      row.error = error instanceof Error ? error.message : String(error);
      summary.failed += 1;
      console.error(
        `[fail] ${hit.collection}.${hit.fieldPath}: ${row.error}`,
      );
    }

    logRows.push(row);
    appendFileSync(logFile, JSON.stringify(row) + "\n");
  }

  // Upload migration log to S3 (live runs)
  if (!dryRun && logRows.length > 0) {
    try {
      const logBody = Buffer.from(
        logRows.map((r) => JSON.stringify(r)).join("\n") + "\n",
        "utf8",
      );
      const key = s3MigrationLogKey(iso);
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
    JSON.stringify({ iso, dryRun, summary, total: hits.length }, null, 2),
  );

  console.log("\nSummary:", summary);
  if (summary.failed > 0) {
    process.exitCode = 1;
  }

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

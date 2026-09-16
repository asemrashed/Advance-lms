import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { TarArchive } from "archiver";
import { BSON } from "bson";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import {
  isS3Configured,
  listObjectsWithPrefix,
  putObject,
  s3MongoBackupKey,
} from "@/lib/s3";

export type MongoBackupFormat = "mongodump-archive-gz" | "collections-bson-tar-gz";

export type MongoBackupResult = {
  buffer: Buffer;
  key: string;
  format: MongoBackupFormat;
  fileName: string;
  size: number;
  createdAt: string;
  isoTimestamp: string;
};

function backupIsoTimestamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function whichMongodump(): Promise<string | null> {
  return new Promise((resolve) => {
    const child = spawn("which", ["mongodump"], { stdio: ["ignore", "pipe", "ignore"] });
    let out = "";
    child.stdout.on("data", (chunk: Buffer) => {
      out += chunk.toString("utf8");
    });
    child.on("close", (code) => {
      const bin = out.trim();
      resolve(code === 0 && bin ? bin : null);
    });
    child.on("error", () => resolve(null));
  });
}

async function runMongodumpArchive(uri: string, outFile: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(
      "mongodump",
      ["--uri", uri, "--archive=" + outFile, "--gzip"],
      { stdio: ["ignore", "ignore", "pipe"] },
    );
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || `mongodump exited with code ${code}`));
    });
  });
}

/**
 * Fallback when mongodump is not installed: tar.gz of per-collection .bson
 * streams (concatenated BSON documents). Not mongorestore --archive compatible;
 * restore via custom tooling or re-import. Prefer mongodump in production.
 */
async function buildCollectionsBsonTarGz(): Promise<Buffer> {
  await connectDB();
  const db = mongoose.connection.db;
  if (!db) throw new Error("MongoDB connection has no db handle");

  const collections = await db.listCollections().toArray();
  const tmpRoot = await mkdtemp(path.join(tmpdir(), "mongo-backup-"));
  const dataDir = path.join(tmpRoot, "collections");
  const { mkdir } = await import("node:fs/promises");
  await mkdir(dataDir, { recursive: true });

  try {
    const meta: { collections: { name: string; count: number }[] } = {
      collections: [],
    };

    for (const colInfo of collections) {
      const name = colInfo.name;
      if (name.startsWith("system.")) continue;
      const col = db.collection(name);
      const cursor = col.find({});
      const chunks: Buffer[] = [];
      let count = 0;
      for await (const doc of cursor) {
        chunks.push(Buffer.from(BSON.serialize(doc as Record<string, unknown>)));
        count += 1;
      }
      await writeFile(path.join(dataDir, `${name}.bson`), Buffer.concat(chunks));
      meta.collections.push({ name, count });
    }

    await writeFile(
      path.join(dataDir, "_backup-meta.json"),
      JSON.stringify(
        {
          format: "collections-bson-tar-gz",
          createdAt: new Date().toISOString(),
          database: db.databaseName,
          ...meta,
        },
        null,
        2,
      ),
    );

    const outFile = path.join(tmpRoot, "mongodb.collections.tar.gz");
    await new Promise<void>((resolve, reject) => {
      const output = createWriteStream(outFile);
      const archive = new TarArchive({ gzip: true });
      output.on("close", () => resolve());
      archive.on("error", reject);
      archive.pipe(output);
      archive.directory(dataDir, "collections");
      void archive.finalize();
    });

    return readFile(outFile);
  } finally {
    await rm(tmpRoot, { recursive: true, force: true });
  }
}

export async function createMongoBackupBuffer(): Promise<{
  buffer: Buffer;
  format: MongoBackupFormat;
  fileName: string;
}> {
  const uri = (process.env.MONGODB_URI || "").trim();
  if (!uri) throw new Error("MONGODB_URI is not configured");

  const mongodumpBin = await whichMongodump();
  if (mongodumpBin) {
    const tmpRoot = await mkdtemp(path.join(tmpdir(), "mongodump-"));
    const outFile = path.join(tmpRoot, "mongodb.archive.gz");
    try {
      await runMongodumpArchive(uri, outFile);
      const buffer = await readFile(outFile);
      return {
        buffer,
        format: "mongodump-archive-gz",
        fileName: "mongodb.archive.gz",
      };
    } finally {
      await rm(tmpRoot, { recursive: true, force: true });
    }
  }

  const buffer = await buildCollectionsBsonTarGz();
  return {
    buffer,
    format: "collections-bson-tar-gz",
    fileName: "mongodb.collections.tar.gz",
  };
}

export async function createAndStoreMongoBackup(options?: {
  uploadToS3?: boolean;
}): Promise<MongoBackupResult> {
  const createdAt = new Date();
  const isoTimestamp = backupIsoTimestamp(createdAt);
  const { buffer, format, fileName } = await createMongoBackupBuffer();
  const key = s3MongoBackupKey(isoTimestamp);

  const shouldUpload = options?.uploadToS3 !== false && isS3Configured();
  if (shouldUpload) {
    await putObject({
      key,
      body: buffer,
      contentType: "application/gzip",
      cacheControl: "private, no-store",
    });
  }

  return {
    buffer,
    key,
    format,
    fileName,
    size: buffer.length,
    createdAt: createdAt.toISOString(),
    isoTimestamp,
  };
}

export async function listMongoBackups(maxKeys = 50) {
  if (!isS3Configured()) return [];
  const items = await listObjectsWithPrefix("backups/mongodb/", maxKeys * 2);
  return items
    .filter((item) => item.key.endsWith("mongodb.archive.gz") || item.key.endsWith(".tar.gz") || item.key.endsWith(".gz"))
    .sort((a, b) => (b.lastModified || "").localeCompare(a.lastModified || ""))
    .slice(0, maxKeys);
}

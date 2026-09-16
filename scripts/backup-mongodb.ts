/**
 * Create a full MongoDB backup (mongodump archive.gz preferred) and upload to S3.
 * Usage: npx tsx scripts/backup-mongodb.ts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

function loadEnvLocal() {
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
      // file optional
    }
  }
}

loadEnvLocal();

async function main() {
  const { createAndStoreMongoBackup } = await import("../src/lib/mongoBackup");
  const { isS3Configured } = await import("../src/lib/s3");

  console.log("Creating MongoDB backup…");
  const result = await createAndStoreMongoBackup({
    uploadToS3: isS3Configured(),
  });

  const localName = `mongodb-backup-${result.isoTimestamp}-${result.fileName}`;
  writeFileSync(localName, result.buffer);
  console.log("Local file:", localName);
  console.log("Format:", result.format);
  console.log("Size:", result.size, "bytes");
  console.log("S3 key:", isS3Configured() ? result.key : "(S3 not configured — skipped upload)");

  const mongoose = await import("mongoose");
  if (mongoose.default.connection.readyState !== 0) {
    await mongoose.default.disconnect();
  }
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

/**
 * Quick report: where thumbnail/proof URLs point in the connected Mongo DB.
 * Usage: npx tsx scripts/report-media-url-sources.ts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

function loadEnv() {
  for (const file of [".env.local", ".env.production", ".env"]) {
    try {
      for (const line of readFileSync(join(process.cwd(), file), "utf8").split("\n")) {
        const t = line.trim();
        if (!t || t.startsWith("#")) continue;
        const eq = t.indexOf("=");
        if (eq === -1) continue;
        const k = t.slice(0, eq).trim();
        let v = t.slice(eq + 1).trim();
        if (
          (v.startsWith('"') && v.endsWith('"')) ||
          (v.startsWith("'") && v.endsWith("'"))
        ) {
          v = v.slice(1, -1);
        }
        if (!process.env[k]) process.env[k] = v;
      }
    } catch {
      // optional
    }
  }
}

loadEnv();

function bucket(url: unknown): string {
  if (!url || typeof url !== "string") return "empty";
  if (url.includes("cloudinary")) return "cloudinary";
  if (url.includes("amazonaws.com") || url.includes(".s3.")) return "s3";
  if (url.startsWith("/uploads/") || url.startsWith("/api/files/")) {
    return "local_or_api";
  }
  if (url.startsWith("http")) return "other_http";
  return "other";
}

async function main() {
  const uri = process.env.MONGODB_URI || "";
  const redacted = uri.replace(/\/\/([^/@]+)@/, "//***@");
  console.log("DB:", redacted.slice(0, 100) + (redacted.length > 100 ? "…" : ""));

  const { default: connectDB } = await import("../src/lib/mongodb");
  const mongoose = await connectDB();
  const db = mongoose.connection.db;
  if (!db) throw new Error("No db");

  const cols = (await db.listCollections().toArray()).map((c) => c.name);

  const checks: [string, string][] = [
    ["courses", "thumbnailUrl"],
    ["batches", "thumbnailUrl"],
    ["blogposts", "thumbnailUrl"],
    ["enrollmentrequests", "proofUrls"],
  ];

  for (const [preferred, field] of checks) {
    const name =
      cols.find((c) => c.toLowerCase() === preferred) ||
      cols.find((c) => c.toLowerCase().includes(preferred.replace(/s$/, "")));
    if (!name) {
      console.log(`\n${preferred}: collection not found`);
      continue;
    }
    const col = db.collection(name);
    const total = await col.countDocuments({});
    const counts: Record<string, number> = {
      cloudinary: 0,
      s3: 0,
      local_or_api: 0,
      other_http: 0,
      other: 0,
      empty: 0,
    };
    const samples: string[] = [];
    const cursor = col.find({}, { projection: { [field]: 1 } });
    for await (const doc of cursor) {
      const v = (doc as Record<string, unknown>)[field];
      if (Array.isArray(v)) {
        if (!v.length) counts.empty += 1;
        else {
          for (const u of v) {
            const b = bucket(u);
            counts[b] = (counts[b] || 0) + 1;
            if (typeof u === "string" && samples.length < 3) samples.push(u);
          }
        }
      } else {
        const b = bucket(v);
        counts[b] = (counts[b] || 0) + 1;
        if (typeof v === "string" && v && samples.length < 3) samples.push(v);
      }
    }
    console.log(`\n${name}.${field} (docs=${total}):`, counts);
    for (const s of samples) console.log("  e.g.", s.slice(0, 130));
  }

  const pdfCol = cols.find((c) => c.toLowerCase() === "uploadedpdfs");
  if (pdfCol) {
    console.log(`\n${pdfCol} documents:`, await db.collection(pdfCol).countDocuments({}));
  }

  await mongoose.disconnect();
}

main()
  .catch((e) => {
    console.error(e);
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

/**
 * Import past-paper questions from the client's exported sheet (CSV/XLSX)
 * into the existing PlatformQuestion bank.
 *
 * - Idempotent: upserts by `qid` (safe to re-run).
 * - Owner defaults to the first admin user (override with --owner <userId>).
 * - Dry-run prints what *would* happen without writing.
 *
 * Usage:
 *   npx tsx scripts/import-pastpaper-questions.ts --file ./export.xlsx --dry-run
 *   npx tsx scripts/import-pastpaper-questions.ts --file ./export.csv
 *   npx tsx scripts/import-pastpaper-questions.ts --file ./export.xlsx --owner 65f... --sheet "Sheet1"
 */
import { readFileSync } from "fs";
import { join } from "path";
import {
  normalizePastPaperQuestion,
} from "../src/lib/pastPaperQuestion";
import { parseWorkbookBuffer } from "../src/lib/pastPaperSheetImport";

const PASTOBER_AI_MODEL =
  process.env.ANTHROPIC_MODEL_PASTPAPER || "claude-haiku-4-5";

function loadEnvLocal() {
  const path = join(process.cwd(), ".env.local");
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
    console.warn("No .env.local found — using process environment");
  }
}

loadEnvLocal();

function argValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 ? process.argv[idx + 1] : undefined;
}

async function main() {
  const file = argValue("--file");
  const dryRun = process.argv.includes("--dry-run");
  const ownerArg = argValue("--owner");
  const sheetArg = argValue("--sheet");

  if (!file) {
    console.error("Missing --file <path to .csv or .xlsx>");
    process.exit(1);
  }

  const { default: connectDB } = await import("../src/lib/mongodb");
  const { default: PlatformQuestion } = await import(
    "../src/models/PlatformQuestion"
  );
  const { default: User } = await import("../src/models/User");

  await connectDB();

  let ownerId = ownerArg;
  if (!ownerId) {
    const admin = await User.findOne({ role: "admin" }).select("_id").lean();
    if (!admin) {
      console.error(
        "No admin user found and no --owner provided. Create an admin or pass --owner <userId>.",
      );
      process.exit(1);
    }
    ownerId = String((admin as { _id: unknown })._id);
  }
  console.log(`Owner (admin) id: ${ownerId}`);

  const buffer = readFileSync(file);
  const parsed = parseWorkbookBuffer(buffer, {
    sheetName: sheetArg,
    filename: file,
  });
  console.log(
    `Read ${parsed.rawRowCount} row(s) from "${parsed.sheetName}" of ${file}`,
  );

  const stats = {
    total: parsed.rawRowCount,
    skippedNoText: 0,
    skippedNoQid: 0,
    inserted: 0,
    updated: 0,
    incomplete: 0,
  };

  for (const row of parsed.rows) {
    const doc = normalizePastPaperQuestion(row, {
      ownerId,
      ownerType: "admin",
      accessPolicy: "private",
      aiGenerated: true,
      aiModel: PASTOBER_AI_MODEL,
    });

    if (!doc) {
      stats.skippedNoText += 1;
      continue;
    }
    if (!doc.qid) {
      stats.skippedNoQid += 1;
      continue;
    }
    if (doc.status === "incomplete") stats.incomplete += 1;

    if (dryRun) {
      const existing = await PlatformQuestion.exists({ qid: doc.qid });
      if (existing) stats.updated += 1;
      else stats.inserted += 1;
      continue;
    }

    const res = await PlatformQuestion.updateOne(
      { qid: doc.qid },
      { $set: doc },
      { upsert: true },
    );
    if (res.upsertedCount) stats.inserted += 1;
    else stats.updated += 1;
  }

  console.log(dryRun ? "Dry run — no writes performed" : "Import complete");
  console.log(JSON.stringify(stats, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

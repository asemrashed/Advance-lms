/**
 * Migrate legacy BatchClass → SubjectModule → SubjectLesson
 * to unified Chapter → Lesson with batchId.
 *
 * Usage:
 *   npx tsx scripts/migrate-batch-curriculum.ts
 *   npx tsx scripts/migrate-batch-curriculum.ts --dry-run
 */
import { readFileSync } from "fs";
import { join } from "path";

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

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const { default: connectDB } = await import("../src/lib/mongodb");
  const { migrateBatchCurriculum } = await import(
    "./migrate-batch-curriculum-lib"
  );

  await connectDB();
  console.log(dryRun ? "Dry run — no writes" : "Running batch curriculum migration…");
  const stats = await migrateBatchCurriculum({ dryRun });
  console.log(JSON.stringify(stats, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

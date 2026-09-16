/**
 * One-time migration: split multi-batch live courses into standalone courses
 * with 2 section batches each.
 *
 * Usage:
 *   npx tsx scripts/migrate-batches-to-standalone-courses.ts --dry-run
 *   npx tsx scripts/migrate-batches-to-standalone-courses.ts
 *   npx tsx scripts/migrate-batches-to-standalone-courses.ts --sections=3
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
  const sectionsArg = process.argv.find((a) => a.startsWith("--sections="));
  const sectionsPerCourse = sectionsArg
    ? Number(sectionsArg.split("=")[1])
    : 2;

  const { default: connectDB } = await import("../src/lib/mongodb");
  const { splitBatchesToStandaloneCourses } = await import(
    "./migrate-batches-to-standalone-courses-lib"
  );

  await connectDB();
  console.log(
    dryRun
      ? "Dry run — no writes. Splitting batches to standalone courses…"
      : "Splitting batches to standalone courses…",
  );
  const stats = await splitBatchesToStandaloneCourses({
    dryRun,
    sectionsPerCourse: Number.isFinite(sectionsPerCourse)
      ? sectionsPerCourse
      : 2,
  });
  console.log(
    JSON.stringify({ dryRun, sectionsPerCourse, ...stats }, null, 2),
  );
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

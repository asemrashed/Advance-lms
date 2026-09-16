/**
 * Merge editorial hero defaults into site-content DB.
 * Usage: npx tsx scripts/migrate-hero-cms.ts
 */
import { readFileSync } from "fs";
import { join } from "path";

function loadEnvLocal() {
  const path = join(process.cwd(), ".env.local");
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
}

loadEnvLocal();

async function main() {
  const { default: connectDB } = await import("../src/lib/mongodb");
  const { migrateEditorialHeroContent } = await import(
    "../src/app/api/_lib/websiteContentStore"
  );
  await connectDB();
  const data = await migrateEditorialHeroContent();

  const hero = data.hero as Record<string, unknown> | undefined;
  const bio = hero?.bioColumns as { left?: string[]; right?: string[] } | undefined;

  console.log("Hero CMS migrated successfully.");
  console.log("  tagline:", hero?.tagline);
  console.log("  brand:", hero?.brandDisplayName);
  console.log("  portrait:", hero?.portraitImage);
  console.log(
    "  bio paragraphs:",
    bio?.left?.length ?? 0,
    "left /",
    bio?.right?.length ?? 0,
    "right",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

/**
 * Rewrite legacy EduPlatform / CodeZyne branding in persisted CMS content.
 * Usage: npx tsx scripts/migrate-rebrand-to-nasmatics.ts
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
  const { migrateRebrandToNasmatics } = await import(
    "../src/app/api/_lib/websiteContentStore"
  );
  await connectDB();
  const data = await migrateRebrandToNasmatics();

  const branding = data.branding as Record<string, unknown> | undefined;
  console.log("CMS rebrand migration complete.");
  console.log("  metaTitle:", data.metaTitle);
  console.log("  logoText:", branding?.logoText);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

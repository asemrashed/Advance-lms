import "server-only";
import fs from "fs";
import path from "path";
import { SITE_LOGO_PUBLIC_PATH } from "@/lib/siteBrandingConstants";

export { SITE_BRAND_NAME } from "@/lib/siteBrandingConstants";

export function getSiteLogoFilePath(): string {
  return path.join(process.cwd(), "public", SITE_LOGO_PUBLIC_PATH.replace(/^\//, ""));
}

export function getSiteLogoDataUri(): string | undefined {
  try {
    const buffer = fs.readFileSync(getSiteLogoFilePath());
    const ext = path.extname(SITE_LOGO_PUBLIC_PATH).toLowerCase();
    const mime =
      ext === ".jpg" || ext === ".jpeg"
        ? "image/jpeg"
        : ext === ".webp"
          ? "image/webp"
          : ext === ".svg"
            ? "image/svg+xml"
            : "image/png";
    return `data:${mime};base64,${buffer.toString("base64")}`;
  } catch {
    return undefined;
  }
}

import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/app/api/_lib/phase12";
import {
  ADMIN_PLATFORM_SETTINGS_CATEGORY,
  getSettingsRecord,
  setSettingsRecord,
} from "@/app/api/_lib/roleSettings";
import {
  createAndStoreMongoBackup,
  listMongoBackups,
} from "@/lib/mongoBackup";
import {
  getPresignedGetUrl,
  isS3Configured,
} from "@/lib/s3";

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

async function recordLastBackup(
  userId: string,
  meta: { key: string; createdAt: string; format: string; size: number },
) {
  try {
    const current = await getSettingsRecord(ADMIN_PLATFORM_SETTINGS_CATEGORY);
    const prevDb = isPlainObject(current.database)
      ? (current.database as Record<string, unknown>)
      : {};
    const database = {
      ...prevDb,
      lastBackupAt: meta.createdAt,
      lastBackupKey: meta.key,
      lastBackupFormat: meta.format,
      lastBackupSize: meta.size,
    };
    await setSettingsRecord(
      ADMIN_PLATFORM_SETTINGS_CATEGORY,
      { ...current, database },
      userId,
    );
  } catch (error) {
    console.warn("[admin/backup] failed to persist lastBackupAt:", error);
  }
}

/**
 * GET — list recent Mongo backups on S3, or return a short-TTL presigned URL.
 *   ?key=backups/mongodb/... → { url }
 *   (no key) → { backups: [...] }
 */
export async function GET(request: NextRequest) {
  const auth = await requireSessionUser(["admin"]);
  if (auth.error) return auth.error;

  try {
    if (!isS3Configured()) {
      return NextResponse.json(
        {
          success: false,
          error: "S3 is not configured; backups cannot be listed",
        },
        { status: 503 },
      );
    }

    const key = request.nextUrl.searchParams.get("key")?.trim();
    if (key) {
      if (!key.startsWith("backups/mongodb/")) {
        return NextResponse.json(
          { success: false, error: "Invalid backup key" },
          { status: 400 },
        );
      }
      const url = await getPresignedGetUrl(key, 300);
      return NextResponse.json({ success: true, url, key, expiresIn: 300 });
    }

    const backups = await listMongoBackups(50);
    return NextResponse.json({ success: true, backups });
  } catch (error) {
    console.error("[admin/backup] GET", error);
    return NextResponse.json(
      { success: false, error: "Failed to list backups" },
      { status: 500 },
    );
  }
}

/**
 * POST — create full Mongo backup (BSON archive gzip when mongodump is
 * available; otherwise collections BSON tar.gz). Uploads to S3 when
 * configured and streams the file to the browser.
 */
export async function POST() {
  const auth = await requireSessionUser(["admin"]);
  if (auth.error) return auth.error;

  try {
    const result = await createAndStoreMongoBackup({
      uploadToS3: isS3Configured(),
    });

    await recordLastBackup(auth.user!.id, {
      key: result.key,
      createdAt: result.createdAt,
      format: result.format,
      size: result.size,
    });

    const headers = new Headers();
    headers.set("Content-Type", "application/gzip");
    headers.set(
      "Content-Disposition",
      `attachment; filename="${result.fileName}"`,
    );
    headers.set("Content-Length", String(result.size));
    headers.set("X-Backup-Key", result.key);
    headers.set("X-Backup-Format", result.format);
    headers.set("X-Backup-Created-At", result.createdAt);
    headers.set("Cache-Control", "no-store");

    return new NextResponse(new Uint8Array(result.buffer), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("[admin/backup] POST", error);
    const message =
      error instanceof Error ? error.message : "Failed to create backup";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    );
  }
}

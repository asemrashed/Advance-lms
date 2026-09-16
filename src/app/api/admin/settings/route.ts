import { NextResponse } from "next/server";
import { requireSessionUser } from "@/app/api/_lib/phase12";
import {
  ADMIN_PLATFORM_CATEGORY_KEYS,
  deepMergePlainObjects,
  mergeAdminPlatformPayload,
} from "@/lib/settingsScope";
import {
  ADMIN_PLATFORM_SETTINGS_CATEGORY,
  getSettingsRecord,
  setSettingsRecord,
  deleteSettingsDoc,
} from "@/app/api/_lib/roleSettings";

const ADMIN_SETTING_KEYS = new Set<string>(ADMIN_PLATFORM_CATEGORY_KEYS);

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export async function GET() {
  const auth = await requireSessionUser(["admin"]);
  if (auth.error) return auth.error;

  try {
    const stored = await getSettingsRecord(ADMIN_PLATFORM_SETTINGS_CATEGORY);
    const data: Record<string, unknown> = {};
    for (const key of ADMIN_SETTING_KEYS) {
      const v = stored[key];
      data[key] = isPlainObject(v) ? v : {};
    }
    return NextResponse.json({ success: true, data });
  } catch (e) {
    console.error("[admin/settings] GET", e);
    return NextResponse.json(
      { success: false, error: "Failed to load settings" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const auth = await requireSessionUser(["super_admin"]);
  if (auth.error) return auth.error;

  try {
    const body = (await req.json()) as { category?: string; settings?: unknown };
    const category = body.category;
    if (!category || typeof category !== "string" || !ADMIN_SETTING_KEYS.has(category)) {
      return NextResponse.json(
        { success: false, error: "Invalid or missing category" },
        { status: 400 },
      );
    }
    if (!isPlainObject(body.settings)) {
      return NextResponse.json(
        { success: false, error: "settings must be an object" },
        { status: 400 },
      );
    }

    const current = await getSettingsRecord(ADMIN_PLATFORM_SETTINGS_CATEGORY);
    const prevCat = isPlainObject(current[category]) ? (current[category] as Record<string, unknown>) : {};
    const mergedCategory = deepMergePlainObjects(prevCat, body.settings as Record<string, unknown>);
    const merged = { ...current, [category]: mergedCategory };
    await setSettingsRecord(ADMIN_PLATFORM_SETTINGS_CATEGORY, merged, auth.user!.id);

    return NextResponse.json({ success: true, data: merged[category] });
  } catch (e) {
    console.error("[admin/settings] POST", e);
    return NextResponse.json(
      { success: false, error: "Failed to update settings" },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
  const auth = await requireSessionUser(["super_admin"]);
  if (auth.error) return auth.error;

  try {
    const body = (await req.json()) as { settings?: unknown };
    if (!isPlainObject(body.settings)) {
      return NextResponse.json(
        { success: false, error: "settings must be an object" },
        { status: 400 },
      );
    }

    const incoming = body.settings as Record<string, unknown>;
    const current = await getSettingsRecord(ADMIN_PLATFORM_SETTINGS_CATEGORY);
    const next = mergeAdminPlatformPayload(current, incoming, ADMIN_PLATFORM_CATEGORY_KEYS);

    await setSettingsRecord(ADMIN_PLATFORM_SETTINGS_CATEGORY, next, auth.user!.id);
    return NextResponse.json({ success: true, data: next });
  } catch (e) {
    console.error("[admin/settings] PUT", e);
    return NextResponse.json(
      { success: false, error: "Failed to save settings" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  const auth = await requireSessionUser(["super_admin"]);
  if (auth.error) return auth.error;

  try {
    const url = new URL(req.url);
    const category = url.searchParams.get("category");

    if (category) {
      if (!ADMIN_SETTING_KEYS.has(category)) {
        return NextResponse.json(
          { success: false, error: "Invalid category" },
          { status: 400 },
        );
      }
      const current = await getSettingsRecord(ADMIN_PLATFORM_SETTINGS_CATEGORY);
      const next = { ...current, [category]: {} };
      await setSettingsRecord(ADMIN_PLATFORM_SETTINGS_CATEGORY, next, auth.user!.id);
    } else {
      await deleteSettingsDoc(ADMIN_PLATFORM_SETTINGS_CATEGORY);
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("[admin/settings] DELETE", e);
    return NextResponse.json(
      { success: false, error: "Failed to reset settings" },
      { status: 500 },
    );
  }
}

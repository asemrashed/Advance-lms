import { NextResponse } from "next/server";
import { requireSessionUser } from "@/app/api/_lib/phase12";
import {
  getSettingsRecord,
  setSettingsRecord,
  studentSettingsCategory,
} from "@/app/api/_lib/roleSettings";
import { pickStudentSettingsForStorage } from "@/lib/settingsScope";

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Student settings hook expects GET `{ student: { ... } }` (no `success` wrapper).
 * PUT accepts `{ settings: partial | full }` and merges into the scoped document.
 */
export async function GET() {
  const auth = await requireSessionUser(["student"]);
  if (auth.error) return auth.error;

  try {
    const category = studentSettingsCategory(auth.user!.id);
    const stored = await getSettingsRecord(category);
    const filtered = pickStudentSettingsForStorage(stored);
    if (Object.keys(filtered).length === 0) {
      return NextResponse.json({});
    }
    return NextResponse.json({ student: filtered });
  } catch (e) {
    console.error("[student/settings] GET", e);
    return NextResponse.json({ error: "Failed to load settings" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const auth = await requireSessionUser(["student"]);
  if (auth.error) return auth.error;

  try {
    const body = (await req.json()) as { settings?: unknown };
    if (!isPlainObject(body.settings)) {
      return NextResponse.json({ error: "settings must be an object" }, { status: 400 });
    }

    const category = studentSettingsCategory(auth.user!.id);
    const current = await getSettingsRecord(category);
    const allowedPatch = pickStudentSettingsForStorage(body.settings as Record<string, unknown>);
    const merged = { ...current, ...allowedPatch };
    const next = pickStudentSettingsForStorage(merged);

    await setSettingsRecord(category, next, auth.user!.id);

    return NextResponse.json({ success: true, student: next });
  } catch (e) {
    console.error("[student/settings] PUT", e);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}

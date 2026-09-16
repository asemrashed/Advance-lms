import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireSessionUser } from "@/app/api/_lib/phase12";
import {
  loadWebsiteContentSettings,
  saveWebsiteContentSettings,
} from "@/app/api/_lib/websiteContentStore";
import {
  CACHE_TAG_WEBSITE_CONTENT,
  defaultWebsiteContent,
  sanitizeWebsiteContentForSave,
  validateWebsiteContent,
} from "@/lib/websiteContentDefaults";

const privateHeaders = { "Cache-Control": "private, no-cache" };

export async function GET() {
  const auth = await requireSessionUser(["super_admin"]);
  if (auth.error) return auth.error;

  try {
    const data = await loadWebsiteContentSettings();
    return NextResponse.json({ success: true, data }, { headers: privateHeaders });
  } catch (error) {
    console.error("[admin/website-content] GET", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch website content" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const auth = await requireSessionUser(["super_admin"]);
  if (auth.error) return auth.error;

  try {
    const body = (await req.json()) as { settings?: unknown };
    if (!body.settings) {
      return NextResponse.json(
        { success: false, error: "Settings are required" },
        { status: 400 },
      );
    }

    const validation = validateWebsiteContent(body.settings);
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, error: validation.error || "Invalid settings" },
        { status: 400 },
      );
    }

    const settings = sanitizeWebsiteContentForSave(
      body.settings as Record<string, unknown>,
    );
    const data = await saveWebsiteContentSettings(settings, auth.user!.id);

    revalidateTag(CACHE_TAG_WEBSITE_CONTENT);
    revalidatePath("/api/website-content");
    revalidatePath("/");

    return NextResponse.json({
      success: true,
      message: "Website content updated successfully",
      data,
    });
  } catch (error) {
    console.error("[admin/website-content] POST", error);
    return NextResponse.json(
      { success: false, error: "Failed to update website content" },
      { status: 500 },
    );
  }
}

/** Reset CMS content to platform defaults. */
export async function PUT() {
  const auth = await requireSessionUser(["super_admin"]);
  if (auth.error) return auth.error;

  try {
    const data = await saveWebsiteContentSettings(
      { ...defaultWebsiteContent },
      auth.user!.id,
    );

    revalidateTag(CACHE_TAG_WEBSITE_CONTENT);
    revalidatePath("/api/website-content");
    revalidatePath("/");

    return NextResponse.json({
      success: true,
      message: "Website content reset to default",
      data,
    });
  } catch (error) {
    console.error("[admin/website-content] PUT", error);
    return NextResponse.json(
      { success: false, error: "Failed to reset website content" },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import {
  hasWebsiteContentDocument,
  loadWebsiteContentSettings,
  saveWebsiteContentSettings,
} from "@/app/api/_lib/websiteContentStore";
import { isSuperAdmin } from "@/lib/roles";
import {
  CACHE_TAG_WEBSITE_CONTENT,
} from "@/lib/websiteContentDefaults";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!isSuperAdmin(session.user.role)) {
    return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
  }

  try {
    const existing = await hasWebsiteContentDocument();
    if (existing) {
      return NextResponse.json({ success: true, seeded: false });
    }

    await saveWebsiteContentSettings(
      await loadWebsiteContentSettings(),
      session.user.id,
    );

    revalidateTag(CACHE_TAG_WEBSITE_CONTENT);

    return NextResponse.json({ success: true, seeded: true });
  } catch (error) {
    console.error("[admin/website-content/seed] POST", error);
    return NextResponse.json(
      { success: false, error: "Failed to seed website content" },
      { status: 500 },
    );
  }
}

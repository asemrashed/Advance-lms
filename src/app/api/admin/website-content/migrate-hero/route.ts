import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { requireSessionUser } from "@/app/api/_lib/phase12";
import { migrateEditorialHeroContent } from "@/app/api/_lib/websiteContentStore";
import { CACHE_TAG_WEBSITE_CONTENT } from "@/lib/websiteContentDefaults";

/** Merge AdvanceLMS editorial hero fields into stored CMS content. */
export async function POST() {
  const auth = await requireSessionUser(["super_admin"]);
  if (auth.error) return auth.error;

  try {
    const data = await migrateEditorialHeroContent(auth.user!.id);

    revalidateTag(CACHE_TAG_WEBSITE_CONTENT);
    revalidatePath("/api/website-content");
    revalidatePath("/");

    return NextResponse.json({
      success: true,
      message: "Hero section migrated to editorial layout",
      data,
    });
  } catch (error) {
    console.error("[admin/website-content/migrate-hero] POST", error);
    return NextResponse.json(
      { success: false, error: "Failed to migrate hero content" },
      { status: 500 },
    );
  }
}

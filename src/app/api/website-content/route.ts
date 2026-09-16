import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import {
  CACHE_TAG_WEBSITE_CONTENT,
  defaultWebsiteContent,
} from "@/lib/websiteContentDefaults";
import { loadWebsiteContentSettings } from "@/app/api/_lib/websiteContentStore";

export const dynamic = "force-dynamic";

const cacheHeaders = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
};

export async function GET() {
  try {
    const getCachedContent = unstable_cache(
      async () => loadWebsiteContentSettings(),
      ["website-content-public"],
      {
        tags: [CACHE_TAG_WEBSITE_CONTENT],
        revalidate: 60,
      },
    );

    const data = await getCachedContent();

    return NextResponse.json({ success: true, data }, { headers: cacheHeaders });
  } catch (error) {
    console.error("[website-content] GET", error);
    return NextResponse.json(
      { success: true, data: defaultWebsiteContent },
      { headers: cacheHeaders },
    );
  }
}

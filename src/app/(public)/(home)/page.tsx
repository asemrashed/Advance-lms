import type { Metadata } from "next";
import { HomePageClient } from "@/components/home/HomePageClient";
import { loadWebsiteContentSettings } from "@/app/api/_lib/websiteContentStore";
import { getFeaturedReviews } from "@/lib/getFeaturedReviews";
import { getFeaturedInstructors } from "@/lib/getFeaturedInstructors";
import type { WebsiteContent } from "@/lib/websiteContentDefaults";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Home",
  description:
    "AdvanceLMS — online courses, learning paths, and expert-led programs.",
};

/** Phase 3: marketing home; featured courses from Redux (mock api client). */
export default async function HomePage() {
  const [raw, featuredReviews, featuredInstructors] = await Promise.all([
    loadWebsiteContentSettings(),
    getFeaturedReviews(),
    getFeaturedInstructors(),
  ]);
  const cmsData = raw as unknown as WebsiteContent;

  return (
    <HomePageClient
      cmsData={cmsData}
      featuredReviews={featuredReviews}
      featuredInstructors={featuredInstructors}
    />
  );
}

import { PublicChrome } from "@/components/layout/PublicChrome";
import { loadWebsiteContentSettings } from "@/app/api/_lib/websiteContentStore";
import type { WebsiteContent } from "@/lib/websiteContentDefaults";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const raw = await loadWebsiteContentSettings();
  const cmsData = raw as unknown as WebsiteContent;

  return <PublicChrome cmsData={cmsData}>{children}</PublicChrome>;
}

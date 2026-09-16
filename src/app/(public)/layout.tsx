import { SiteFooter, SiteHeader } from "@/components/layout";
import { loadWebsiteContentSettings } from "@/app/api/_lib/websiteContentStore";
import type { WebsiteContent } from "@/lib/websiteContentDefaults";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const raw = await loadWebsiteContentSettings();
  const cmsData = raw as unknown as WebsiteContent;

  return (
    <>
      <SiteHeader cmsData={cmsData} />
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      <SiteFooter cmsData={cmsData} />
    </>
  );
}

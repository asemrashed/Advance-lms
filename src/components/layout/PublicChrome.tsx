"use client";

import { usePathname } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/layout";
import type { WebsiteContent } from "@/lib/websiteContentDefaults";

const HIDE_CHROME_PATHS = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
]);

type PublicChromeProps = {
  cmsData: WebsiteContent | null;
  children: React.ReactNode;
};

export function PublicChrome({ cmsData, children }: PublicChromeProps) {
  const pathname = usePathname() || "";
  const hideChrome = HIDE_CHROME_PATHS.has(pathname);

  return (
    <>
      {hideChrome ? null : <SiteHeader cmsData={cmsData} />}
      <main className="flex min-h-0 flex-1 flex-col">{children}</main>
      {hideChrome ? null : <SiteFooter cmsData={cmsData} />}
    </>
  );
}

"use client";

import Link from "next/link";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { SITE_BRAND_NAME } from "@/lib/siteBrandingConstants";
import { cn } from "@/lib/utils";

type DashboardSidebarBrandProps = {
  className?: string;
};

/** Full logo when the sidebar is expanded; hidden when collapsed to icon-only mode. */
export function DashboardSidebarBrand({ className }: DashboardSidebarBrandProps) {
  return (
    <Link
      href="/"
      className={cn("shrink-0", className)}
      aria-label={SITE_BRAND_NAME}
    >
      <BrandLogo className="h-9" imageClassName="h-9 max-w-[9.5rem]" />
    </Link>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { RESOURCE_TABS } from "@/lib/resources/config";

export function ResourceTabBar() {
  const pathname = usePathname();

  return (
    <div
      className="flex flex-wrap gap-2 border-b border-border pb-3"
      role="tablist"
      aria-label="Resource sections"
    >
      {RESOURCE_TABS.map((tab) => {
        const active =
          pathname === tab.studentHref ||
          pathname.startsWith(`${tab.studentHref}/`) ||
          (pathname === "/student/resources" && tab.id === "notes");

        return (
          <Link
            key={tab.id}
            href={tab.studentHref}
            role="tab"
            aria-selected={active}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
              active
                ? "bg-primary text-on-primary shadow-sm"
                : "bg-surface-container text-muted-foreground hover:bg-surface-container-high hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

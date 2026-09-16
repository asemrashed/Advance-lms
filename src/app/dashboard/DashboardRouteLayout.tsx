"use client";

import { DashboardBackButton } from "./DashboardBackButton";
import { DashboardSidebar } from "./DashboardSidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

/**
 * Dashboard shell shared by all 3 roles (admin / instructor / student).
 *
 * Desktop & Tablet
 *   – Sidebar visible by default (defaultOpen={true})
 *   – SidebarTrigger in the sidebar header collapses it to icon-only (desktop)
 *
 * Mobile
 *   – Sidebar hidden by default (openMobile starts false in shadcn provider)
 *   – SidebarTrigger in the sticky content header opens the sheet overlay
 */
export function DashboardRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider defaultOpen>
      <div className="flex min-h-svh w-full overflow-hidden">
        <DashboardSidebar />
        <SidebarInset className="flex min-h-svh min-w-0 flex-1 flex-col overflow-hidden">
          <header className="sticky top-0 z-40 flex h-12 shrink-0 items-center gap-2 border-b border-border/70 bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            <SidebarTrigger className="md:hidden" />
            <DashboardBackButton />
          </header>
          <div
            data-dashboard-scroll
            className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden scrollbar-hide"
          >
            {children}
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

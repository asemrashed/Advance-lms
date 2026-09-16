"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { LuChevronDown, LuLogOut, LuSettings, LuX } from "react-icons/lu";
import { useAppSelector } from "@/store/hooks";
import type { DashboardRole } from "@/types/dashboard";
import {
  getDashboardSidebarNavForPath,
  type SidebarNavCategory,
  type SidebarNavItem,
} from "./dashboardSidebarNav";
import { signOutWithDeviceRevoke } from "@/lib/logoutClient";
import { cn } from "@/lib/utils";
import { isSuperAdmin } from "@/lib/roles";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { Sidebar, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { DashboardSidebarBrand } from "@/components/dashboard/DashboardSidebarBrand";
import { useRecordedCoursesEnabled } from "@/hooks/useRecordedCoursesEnabled";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { ReactNode } from "react";

type RoleChrome = {
  headerFooter: string;
  triggerHover: string;
  footerSettings: string;
  footerLogout: string;
};

const WHITE_CHROME: RoleChrome = {
  headerFooter: "border-gray-200 bg-white",
  triggerHover: "hover:bg-gray-100",
  footerSettings: "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
  footerLogout: "text-red-600 hover:bg-red-50 hover:text-red-700",
};

function roleShellChrome(_role: DashboardRole): RoleChrome {
  return WHITE_CHROME;
}

function SidebarChromeHeader({
  shellClass,
  triggerHover,
  mobileCloseBtn,
}: {
  shellClass: string;
  triggerHover: string;
  mobileCloseBtn?: ReactNode;
}) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 rounded-b-2xl border-b shadow-sm transition-all duration-300",
        shellClass,
      )}
    >
      <div className="flex items-center justify-between gap-2 px-4 py-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2">
        <DashboardSidebarBrand className="min-w-0 group-data-[collapsible=icon]:hidden" />
        <div className="flex shrink-0 items-center gap-1">
          <SidebarTrigger
            className={cn(
              "hidden size-8 cursor-pointer md:inline-flex",
              triggerHover,
            )}
          />
          {mobileCloseBtn}
        </div>
      </div>
    </header>
  );
}

function isNavActive(pathname: string, href: string) {
  if (href === "#") return false;
  if (href === "/dashboard") {
    return pathname === "/dashboard";
  }
  if (
    href === "/student/dashboard" ||
    href === "/instructor/dashboard" ||
    href === "/admin/dashboard"
  ) {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isNavItemOrChildActive(pathname: string, item: SidebarNavItem) {
  if (item.children?.length) {
    return (
      isNavActive(pathname, item.href) ||
      item.children.some((child) => isNavActive(pathname, child.href))
    );
  }
  return isNavActive(pathname, item.href);
}

function StudentNavItem({
  item,
  role,
  pathname,
  onNavClick,
}: {
  item: SidebarNavItem;
  role: DashboardRole;
  pathname: string;
  onNavClick?: () => void;
}) {
  const hasChildren = Boolean(item.children?.length);
  const active = isNavItemOrChildActive(pathname, item);
  const c = navButtonClasses(role, active);
  const [open, setOpen] = useState(active);

  if (!hasChildren) {
    const inner = (
      <>
        <div className="flex w-full items-center gap-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0">
          <div
            className={`flex h-5 w-5 shrink-0 items-center justify-center transition-colors duration-200 ${c.icon}`}
          >
            <item.icon className="h-5 w-5" />
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-between group-data-[collapsible=icon]:hidden">
            <span className={`truncate text-sm font-medium ${c.label}`}>
              {item.label}
            </span>
            {item.badge ? (
              <Badge role={role} label={item.label} value={item.badge} />
            ) : null}
          </div>
        </div>
        {active ? (
          <>
            <div className={c.glow} />
            <div className={c.dot} />
          </>
        ) : null}
      </>
    );

    return (
      <Link href={item.href} className={c.wrap} onClick={onNavClick}>
        {inner}
      </Link>
    );
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <button type="button" className={cn(c.wrap, "w-full text-left")}>
          <div className="flex w-full items-center gap-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0">
            <div
              className={`flex h-5 w-5 shrink-0 items-center justify-center transition-colors duration-200 ${c.icon}`}
            >
              <item.icon className="h-5 w-5" />
            </div>
            <div className="flex min-w-0 flex-1 items-center justify-between group-data-[collapsible=icon]:hidden">
              <span className={`truncate text-sm font-medium ${c.label}`}>
                {item.label}
              </span>
              <LuChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                  open && "rotate-180",
                )}
              />
            </div>
          </div>
          {active ? (
            <>
              <div className={c.glow} />
              <div className={c.dot} />
            </>
          ) : null}
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="group-data-[collapsible=icon]:hidden">
        <div className="ml-4 space-y-1 border-l border-border/60 py-1 pl-2">
          {item.children!.map((child) => {
            const childActive = isNavActive(pathname, child.href);
            const childClasses = navButtonClasses(role, childActive);
            return (
              <Link
                key={child.href}
                href={child.href}
                className={cn(childClasses.wrap, "py-2")}
                onClick={onNavClick}
              >
                <div className="flex w-full items-center gap-3">
                  <div
                    className={`flex h-4 w-4 shrink-0 items-center justify-center ${childClasses.icon}`}
                  >
                    <child.icon className="h-4 w-4" />
                  </div>
                  <span className={`truncate text-sm ${childClasses.label}`}>
                    {child.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function navButtonClasses(
  role: DashboardRole,
  active: boolean,
): { wrap: string; icon: string; label: string; glow: string; dot: string } {
  if (role === "student") {
    return {
      wrap: `group relative flex items-center cursor-pointer rounded-lg px-3 py-3 transition-all duration-200
        group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-2 ${
        active
          ? "border-l-4 border-green-500 bg-green-50 text-green-700 group-data-[collapsible=icon]:border-l-0"
          : "text-gray-900 hover:bg-gray-100"
      }`,
      icon: active
        ? "text-green-600"
        : "text-gray-600 group-hover:text-gray-900",
      label: active ? "text-green-700" : "text-gray-900",
      glow: "absolute inset-0 rounded-lg bg-green-500/5 group-data-[collapsible=icon]:hidden",
      dot: "absolute right-2 top-1/2 h-2 w-2 -translate-y-1/2 transform rounded-full bg-green-500 group-data-[collapsible=icon]:hidden",
    };
  }
  if (role === "instructor") {
    return {
      wrap: `group relative flex items-center cursor-pointer rounded-lg px-3 py-3 transition-all duration-200
        group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-2 ${
        active
          ? "border-l-4 border-primary bg-primary/10 text-primary group-data-[collapsible=icon]:border-l-0"
          : "text-gray-900 hover:bg-gray-100"
      }`,
      icon: active
        ? "text-primary"
        : "text-gray-600 group-hover:text-gray-900",
      label: active ? "text-primary" : "text-gray-900",
      glow: "absolute inset-0 rounded-lg bg-primary/5 group-data-[collapsible=icon]:hidden",
      dot: "absolute right-2 top-1/2 h-2 w-2 -translate-y-1/2 transform rounded-full bg-primary group-data-[collapsible=icon]:hidden",
    };
  }
  return {
    wrap: "group relative flex items-center cursor-pointer rounded-lg px-3 py-3 transition-all duration-200 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-2",
    icon: "",
    label: "",
    glow: "",
    dot: "",
  };
}

function Badge({
  role,
  label,
  value,
}: {
  role: DashboardRole;
  label: string;
  value: string;
}) {
  if (role === "admin") {
    return (
      <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-white group-data-[collapsible=icon]:hidden">
        {value}
      </span>
    );
  }
  const cls =
    label === "Exams"
      ? "bg-orange-500 animate-pulse"
      : label === "Exam History"
        ? "bg-blue-500"
        : label === "Profile"
          ? "bg-amber-500 animate-pulse"
          : role === "instructor"
            ? "bg-primary"
            : "bg-green-600";
  return (
    <span
      className={`ml-2 flex h-5 min-w-5 items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium text-white group-data-[collapsible=icon]:hidden ${cls}`}
      title={label === "Profile" ? "Complete your profile" : undefined}
    >
      {value}
    </span>
  );
}

function NavCategories({
  categories,
  role,
  pathname,
  onNavClick,
}: {
  categories: SidebarNavCategory[];
  role: DashboardRole;
  pathname: string;
  onNavClick?: () => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide bg-white px-0 pb-4 pt-2">
      {categories.map((category, categoryIndex) => (
        <div key={categoryIndex} className="mb-4 last:mb-0">
          <div
            className={cn(
              "mb-3 hidden px-4 text-xs font-semibold uppercase tracking-wider sm:block group-data-[collapsible=icon]:invisible",
              role === "student"
                ? "text-green-700/60"
                : role === "instructor"
                  ? "text-primary/60"
                  : "text-gray-500",
            )}
          >
            {category.category}
          </div>
          <div className="space-y-1 px-2 group-data-[collapsible=icon]:px-1">
            {category.items.map((item, itemIndex) => {
              if (role === "student" && item.children?.length) {
                return (
                  <StudentNavItem
                    key={itemIndex}
                    item={item}
                    role={role}
                    pathname={pathname}
                    onNavClick={onNavClick}
                  />
                );
              }

              const active = isNavActive(pathname, item.href);
              const c = navButtonClasses(role, active);

              const inner = (
                <>
                  <div className="flex w-full items-center gap-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0">
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center transition-colors duration-200 ${c.icon}`}
                    >
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div className="flex min-w-0 flex-1 items-center justify-between group-data-[collapsible=icon]:hidden">
                      <span
                        className={`truncate text-sm font-medium ${c.label}`}
                      >
                        {item.label}
                      </span>
                      {item.badge ? (
                        <Badge
                          role={role}
                          label={item.label}
                          value={item.badge}
                        />
                      ) : null}
                    </div>
                  </div>
                  {active ? (
                    <>
                      <div className={c.glow} />
                      <div className={c.dot} />
                    </>
                  ) : null}
                </>
              );

              if (item.href !== "#") {
                return (
                  <Link key={itemIndex} href={item.href} className={c.wrap} onClick={onNavClick}>
                    {inner}
                  </Link>
                );
              }

              return (
                <a
                  key={itemIndex}
                  href="#"
                  className={c.wrap}
                  onClick={(e) => e.preventDefault()}
                >
                  {inner}
                </a>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function AdminNavCategories({
  categories,
  pathname,
  onNavClick,
}: {
  categories: SidebarNavCategory[];
  pathname: string;
  onNavClick?: () => void;
}) {
  return (
    <div
      className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide px-0 pb-4 pt-2"
      style={{ backgroundColor: "#FFFFFF" }}
    >
      {categories.map((category, categoryIndex) => (
        <div key={categoryIndex} className="mb-4 last:mb-0">
          <div className="mb-3 hidden px-4 text-xs font-semibold uppercase tracking-wider text-primary/60 sm:block group-data-[collapsible=icon]:invisible">
            {category.category}
          </div>
          <div className="space-y-1 px-2 group-data-[collapsible=icon]:px-1">
            {category.items.map((item, itemIndex) => {
              const active = isNavActive(pathname, item.href);
              // flex layout; icon-only when collapsed; border-l hidden so it can't overflow
              const base = "group relative flex items-center rounded-lg px-3 py-3 transition-all duration-200 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-2 group-data-[collapsible=icon]:border-l-0";

              const content = (
                <>
                  <div className="flex w-full items-center gap-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0">
                    <div
                      className={`flex h-5 w-5 shrink-0 items-center justify-center transition-colors duration-200 ${
                        active ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div className="flex min-w-0 flex-1 items-center justify-between group-data-[collapsible=icon]:hidden">
                      <span
                        className={`truncate text-sm font-medium ${
                          active ? "text-primary" : "text-foreground"
                        }`}
                      >
                        {item.label}
                      </span>
                      {item.badge ? (
                        <Badge
                          role="admin"
                          label={item.label}
                          value={item.badge}
                        />
                      ) : null}
                    </div>
                  </div>
                  {active ? (
                    <>
                      <div className="absolute inset-0 rounded-lg bg-primary/5" />
                      <div className="absolute right-2 top-1/2 h-2 w-2 -translate-y-1/2 transform rounded-full bg-primary" />
                    </>
                  ) : null}
                </>
              );

              if (item.href !== "#") {
                return (
                  <Link
                    key={itemIndex}
                    href={item.href}
                    onClick={onNavClick}
                    className={cn(
                      base,
                      active
                        ? "border-l-4 border-primary bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted/60",
                    )}
                  >
                    {content}
                  </Link>
                );
              }

              return (
                <a
                  key={itemIndex}
                  href="#"
                  className={base}
                  style={{ color: "#6B7280" }}
                  onClick={(e) => e.preventDefault()}
                >
                  {content}
                </a>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardSidebar() {
  const role = useAppSelector((s) => s.ui.dashboardView);
  const authUser = useAppSelector((s) => s.auth.user);
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  const [instructorBadges, setInstructorBadges] = useState<
    Record<string, string | null>
  >({});
  const [studentBadges, setStudentBadges] = useState<
    Record<string, string | null>
  >({});
  const { recordedCoursesEnabled } = useRecordedCoursesEnabled();
  const { permissions } = useAdminPermissions();
  const baseCategories = useMemo(
    () =>
      getDashboardSidebarNavForPath(role, pathname, {
        recordedCoursesEnabled,
        isSuperAdmin: isSuperAdmin(authUser?.role),
        adminPermissions: permissions,
      }),
    [role, pathname, recordedCoursesEnabled, authUser?.role, permissions],
  );
  const categories = useMemo(() => {
    const badges =
      role === "instructor"
        ? instructorBadges
        : role === "student"
          ? studentBadges
          : {};
    if (Object.keys(badges).length === 0) return baseCategories;
    return baseCategories.map((category) => ({
      ...category,
      items: category.items.map((item) => {
        if (item.label === "Assignments") {
          return { ...item, badge: badges.assignments ?? null };
        }
        if (item.label === "Profile") {
          return { ...item, badge: badges.profile ?? null };
        }
        return item;
      }),
    }));
  }, [baseCategories, instructorBadges, role, studentBadges]);

  useEffect(() => {
    if (role !== "instructor" || !pathname.startsWith("/instructor")) return;
    let cancelled = false;

    const loadBadges = async () => {
      try {
        const res = await fetch("/api/instructor/dashboard", {
          credentials: "include",
        });
        const data = await res.json();
        if (!res.ok || cancelled) return;
        setInstructorBadges({
          assignments: data?.data?.navBadges?.assignments ?? null,
          profile: data?.data?.navBadges?.profile ?? null,
        });
      } catch {
        /* ignore badge fetch failures */
      }
    };

    void loadBadges();
    const onProfileUpdated = () => {
      void loadBadges();
    };
    window.addEventListener("instructor-profile-updated", onProfileUpdated);
    return () => {
      cancelled = true;
      window.removeEventListener("instructor-profile-updated", onProfileUpdated);
    };
  }, [pathname, role]);

  useEffect(() => {
    if (role !== "student" || !pathname.startsWith("/student")) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/student/assignments?limit=200", {
          credentials: "include",
        });
        const data = await res.json();
        if (!res.ok || cancelled) return;
        const pending = Number(data?.data?.stats?.pending ?? 0);
        setStudentBadges({
          assignments: pending > 0 ? String(pending) : null,
        });
      } catch {
        /* ignore badge fetch failures */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, role]);
  const handleLogOut = () => {
    signOutWithDeviceRevoke({ callbackUrl: "/login" });
  };

  /** Close the mobile sheet after a nav link is tapped */
  const handleNavClick = () => {
    if (isMobile) setOpenMobile(false);
  };

  /** Mobile-only ✕ button rendered inside sidebar header */
  const MobileCloseBtn = isMobile ? (
    <button
      type="button"
      aria-label="Close sidebar"
      onClick={() => setOpenMobile(false)}
      className="ml-auto flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-primary transition-colors hover:bg-black/10"
    >
      <LuX className="h-4 w-4" />
    </button>
  ) : null;

  const shellChrome = roleShellChrome(role);

  if (role === "admin") {
    return (
      <Sidebar
        side="left"
        collapsible="icon"
        className="border-r-0"
      >
        <aside className="flex h-full w-full shrink-0 flex-col overflow-y-auto overflow-x-hidden scrollbar-hide border-b border-gray-200 bg-white transition-all duration-300 ease-in-out sm:border-b-0">
          <SidebarChromeHeader
            shellClass={shellChrome.headerFooter}
            triggerHover={shellChrome.triggerHover}
            mobileCloseBtn={MobileCloseBtn}
          />

          <AdminNavCategories categories={categories} pathname={pathname} onNavClick={handleNavClick} />

          <footer
            className={cn(
              "sticky bottom-0 z-30 rounded-t-2xl border-t shadow-sm transition-all duration-300",
              shellChrome.headerFooter,
            )}
          >
            <div className="space-y-1 p-4 group-data-[collapsible=icon]:p-2">
              <Link
                href="/admin/settings"
                onClick={handleNavClick}
                className={cn(
                  "group relative flex items-center rounded-lg px-3 py-3 transition-all duration-200 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-2",
                  shellChrome.footerSettings,
                )}
              >
                <div className="flex items-center gap-3 group-data-[collapsible=icon]:gap-0">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                    <LuSettings className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium group-data-[collapsible=icon]:hidden">
                    Settings
                  </span>
                </div>
              </Link>
              <li
                onClick={() => handleLogOut()}
                className={cn(
                  "group relative flex cursor-pointer items-center rounded-lg px-3 py-3 transition-all duration-200 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:py-2 group-data-[collapsible=icon]:border-l-0",
                  shellChrome.footerLogout,
                )}
              >
                <div className="flex items-center gap-3 group-data-[collapsible=icon]:gap-0">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                    <LuLogOut className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium group-data-[collapsible=icon]:hidden">Logout</span>
                </div>
              </li>
            </div>
          </footer>
        </aside>
      </Sidebar>
    );
  }

  const lightShell =
    "flex h-full w-full shrink-0 flex-col overflow-y-auto overflow-x-hidden scrollbar-hide border-b border-gray-200 bg-white transition-all duration-300 ease-in-out sm:border-b-0";

  return (
    <Sidebar side="left" collapsible="icon" className="border-r-0">
      <aside
        className={cn(
          lightShell,
          role === "instructor" && "instructor-theme",
          role === "student" && "student-theme",
        )}
      >
      {role === "student" || role === "instructor" ? (
        <SidebarChromeHeader
          shellClass={shellChrome.headerFooter}
          triggerHover={shellChrome.triggerHover}
          mobileCloseBtn={MobileCloseBtn}
        />
      ) : null}

      <NavCategories
        categories={categories}
        role={role}
        pathname={pathname}
        onNavClick={handleNavClick}
      />

      <footer
        className={cn(
          "sticky bottom-0 z-30 rounded-t-2xl border-t shadow-sm transition-all duration-300",
          shellChrome.headerFooter,
        )}
      >
        <div className="p-4 group-data-[collapsible=icon]:px-2">
          {role === "instructor" ? (
            <div className="space-y-1">
              <Link
                href="/instructor/settings"
                onClick={handleNavClick}
                className={cn(
                  "group relative flex cursor-pointer rounded-lg px-3 py-3 transition-all duration-200",
                  shellChrome.footerSettings,
                )}
              >
                <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                    <LuSettings className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium group-data-[collapsible=icon]:hidden">Settings</span>
                </div>
              </Link>
              <Link
                onClick={(e) => {
                  e.preventDefault();
                  signOutWithDeviceRevoke({ callbackUrl: "/login" });
                }}
                href="/login"
                className={cn(
                  "group relative flex cursor-pointer rounded-lg px-3 py-3 transition-all duration-200",
                  shellChrome.footerLogout,
                )}
              >
                <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                    <LuLogOut className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium group-data-[collapsible=icon]:hidden">Logout</span>
                </div>
              </Link>
            </div>
          ) : (
            <div
              onClick={(e) => {
                e.preventDefault();
                signOutWithDeviceRevoke({ callbackUrl: "/login" });
              }}
              className={cn(
                "group relative flex cursor-pointer rounded-lg px-3 py-3 transition-all duration-200",
                shellChrome.footerLogout,
              )}
            >
              <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center">
                  <LuLogOut className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium group-data-[collapsible=icon]:hidden">Logout</span>
              </div>
            </div>
          )}
        </div>
      </footer>
      </aside>
    </Sidebar>
  );
}

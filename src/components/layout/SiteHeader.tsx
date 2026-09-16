"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { signOutWithDeviceRevoke } from "@/lib/logoutClient";
import { cn } from "@/lib/cn";
import { useAppSelector } from "@/store/hooks";
import {
  defaultWebsiteContent,
  type WebsiteContent,
} from "@/lib/websiteContentDefaults";
import {
  filterNavItemsBySectionOrder,
  isHomeSectionEnabled,
} from "@/lib/navSectionVisibility";

import { LuShoppingBag, LuFacebook, LuYoutube, LuLinkedin, LuMail } from "react-icons/lu";
import { BrandLogo } from "@/components/layout/BrandLogo";
import { ResourcesNavDropdown } from "@/components/layout/ResourcesNavDropdown";

const FALLBACK_NAV = [
  { href: "/", label: "Home" },
  { href: "/enroll", label: "Enroll" },
  { href: "/courses", label: "Courses" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

type NavItem = { href: string; label: string };

const ENROLL_NAV_ITEM: NavItem = { href: "/enroll", label: "Enroll" };

function normalizeNavLabel(href: string, label: string): string {
  if (href === "/about") return "About";
  if (href === "/courses" && label.toLowerCase() === "all courses") return "Courses";
  return label;
}

function resolveHeaderNav(cmsData?: WebsiteContent | null): NavItem[] {
  const items = cmsData?.mobileMenu?.items?.filter(
    (item) => item.label?.trim() && item.href?.trim(),
  );
  const base =
    items && items.length > 0
      ? items.map((item) => ({
          href: item.href.trim(),
          label: normalizeNavLabel(item.href.trim(), item.label.trim()),
        }))
      : [...FALLBACK_NAV];

  const hasEnroll = base.some(
    (item) => item.href === "/enroll" || item.label.toLowerCase() === "enroll",
  );
  if (hasEnroll) {
    return filterNavItemsBySectionOrder(base, cmsData?.sectionOrder);
  }

  const coursesIdx = base.findIndex((item) => item.href === "/courses");
  if (coursesIdx >= 0) {
    return filterNavItemsBySectionOrder(
      [
        ...base.slice(0, coursesIdx + 1),
        ENROLL_NAV_ITEM,
        ...base.slice(coursesIdx + 1),
      ],
      cmsData?.sectionOrder,
    );
  }
  return filterNavItemsBySectionOrder([...base, ENROLL_NAV_ITEM], cmsData?.sectionOrder);
}

function resolveHeaderBranding(cmsData?: WebsiteContent | null) {
  const branding = cmsData?.branding;
  const defaults = defaultWebsiteContent.branding;
  return {
    logoAlt: branding?.logoText?.trim() || defaults.logoText,
  };
}

function resolveSignInCta(cmsData?: WebsiteContent | null) {
  const defaults = defaultWebsiteContent;
  const login = cmsData?.buttons?.login;
  return {
    text: login?.text?.trim() || defaults.buttons.login.text,
    href: login?.href?.trim() || defaults.buttons.login.href,
  };
}

type SocialLinksProps = {
  cmsData?: WebsiteContent | null;
  className?: string;
};

function HeaderSocialLinks({ cmsData, className }: SocialLinksProps) {
  return (
    <div className={cn("flex items-center gap-5 text-muted-foreground/60", className)}>
      <a
        href={cmsData?.socialMedia?.facebook || "https://facebook.com"}
        target="_blank"
        rel="noopener noreferrer"
        className="cursor-pointer transition-colors duration-200 hover:text-primary"
        aria-label="Facebook"
      >
        <LuFacebook className="h-[18px] w-[18px]" />
      </a>
      <a
        href={cmsData?.socialMedia?.youtube || "https://youtube.com"}
        target="_blank"
        rel="noopener noreferrer"
        className="cursor-pointer transition-colors duration-200 hover:text-primary"
        aria-label="YouTube"
      >
        <LuYoutube className="h-[18px] w-[18px]" />
      </a>
      <a
        href={
          cmsData?.contactPage?.email
            ? `mailto:${cmsData.contactPage.email}`
            : "mailto:nasmatics@gmail.com"
        }
        className="cursor-pointer transition-colors duration-200 hover:text-primary"
        aria-label="Gmail"
      >
        <LuMail className="h-[18px] w-[18px]" />
      </a>
      <a
        href={cmsData?.socialMedia?.linkedin || "https://linkedin.com"}
        target="_blank"
        rel="noopener noreferrer"
        className="cursor-pointer transition-colors duration-200 hover:text-primary"
        aria-label="LinkedIn"
      >
        <LuLinkedin className="h-[18px] w-[18px]" />
      </a>
    </div>
  );
}

type SiteHeaderProps = {
  cmsData?: WebsiteContent | null;
};

export function SiteHeader({ cmsData }: SiteHeaderProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const { data: session } = useSession();

  const cartCount = useAppSelector((s) =>
    s.cart.items.reduce((n, i) => n + i.quantity, 0),
  );
  const coursesStatus = useAppSelector((s) => s.courses.status);
  const publicCoursesCount = useAppSelector((s) => s.courses.publicList.length);

  const role = session?.user?.role;
  const dashboardHref =
    role === "super_admin" || role === "admin"
      ? "/admin/dashboard"
      : role === "instructor"
        ? "/instructor/dashboard"
        : "/student/dashboard";

  const avatarLabel =
    session?.user?.name?.trim().charAt(0).toUpperCase() || "U";

  const nav = useMemo(() => resolveHeaderNav(cmsData), [cmsData]);
  const branding = useMemo(() => resolveHeaderBranding(cmsData), [cmsData]);
  const signInCta = useMemo(() => resolveSignInCta(cmsData), [cmsData]);
  const coursesNavEnabled = useMemo(
    () => isHomeSectionEnabled("courses", cmsData?.sectionOrder),
    [cmsData?.sectionOrder],
  );
  const enrollNavEnabled = useMemo(
    () => isHomeSectionEnabled("batches", cmsData?.sectionOrder),
    [cmsData?.sectionOrder],
  );

  const homeItem = nav.find((i) => i.href === "/") || { href: "/", label: "Home" };
  const enrollItem = nav.find((i) => i.href === "/enroll") || { href: "/enroll", label: "Enroll" };
  const coursesItem = nav.find((i) => i.href === "/courses") || { href: "/courses", label: "Courses" };
  const blogItem = nav.find((i) => i.href === "/blog") || { href: "/blog", label: "Blog" };
  const aboutItem = nav.find((i) => i.href === "/about") || { href: "/about", label: "About" };
  const contactItem = nav.find((i) => i.href === "/contact") || { href: "/contact", label: "Contact" };

  useEffect(() => {
    setOpen(false);
    setAvatarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".mobile-nav-root")) {
        setOpen(false);
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [open]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".avatar-menu")) {
        setAvatarOpen(false);
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full">
      <div className="mobile-nav-root relative mx-auto mt-2 max-w-[96%] md:mt-4">
        <div
          className={cn(
            "flex items-center justify-between gap-2 border border-border/60 bg-white px-3 py-3 shadow-[var(--shadow-header)] sm:gap-3 sm:px-5 sm:py-3.5 lg:px-6 xl:px-8",
            open
              ? "rounded-t-md border-b-0 md:rounded-t-2xl"
              : "rounded-md md:rounded-2xl",
          )}
        >
          {/* LEFT — logo + social (visible whenever desktop nav is shown) */}
          <div className="flex shrink-0 items-center gap-5 lg:gap-6">
            <Link href="/" className="shrink-0">
              <BrandLogo alt={branding.logoAlt} />
            </Link>
            <HeaderSocialLinks cmsData={cmsData} className="hidden lg:flex" />
          </div>

          {/* CENTER — desktop nav */}
          <nav className="hidden min-w-0 flex-1 items-center justify-center gap-5 lg:flex xl:gap-7 2xl:gap-8">
            <NavLink href={homeItem.href} label={homeItem.label} pathname={pathname} />
            <ResourcesNavDropdown pathname={pathname} variant="desktop" />
            {enrollNavEnabled ? (
              <NavLink href={enrollItem.href} label={enrollItem.label} pathname={pathname} />
            ) : null}
            {coursesNavEnabled ? (
              <NavLink href={coursesItem.href} label={coursesItem.label} pathname={pathname} />
            ) : null}
            <NavLink href={blogItem.href} label={blogItem.label} pathname={pathname} />
            <NavLink href={aboutItem.href} label={aboutItem.label} pathname={pathname} />
            <NavLink href={contactItem.href} label={contactItem.label} pathname={pathname} />
          </nav>

          {/* RIGHT — cart, sign in, mobile toggle */}
          <div className="flex shrink-0 items-center gap-3 sm:gap-4">
            <Link
              href="/cart"
              className="relative inline-flex cursor-pointer rounded-full px-2 text-sm font-semibold text-muted-foreground hover:text-primary sm:px-3"
            >
              <LuShoppingBag className="text-lg md:text-2xl" />
              {cartCount > 0 && (
                <span className="ml-1 min-w-[1.25rem] rounded-full bg-secondary px-1.5 py-0.5 text-xs font-bold text-on-secondary">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>

            {session?.user ? (
              <div className="avatar-menu relative inline-block">
                <button
                  type="button"
                  onClick={() => setAvatarOpen((v) => !v)}
                  className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-primary text-sm font-bold text-on-primary hover:bg-primary/90 md:h-9 md:w-9"
                >
                  {avatarLabel}
                </button>

                {avatarOpen && (
                  <div className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-md border border-border bg-white shadow-lg">
                    <Link
                      href={dashboardHref}
                      className="block px-4 py-2 text-sm hover:bg-gray-100"
                      onClick={() => setAvatarOpen(false)}
                    >
                      Dashboard
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setAvatarOpen(false);
                        signOutWithDeviceRevoke({ callbackUrl: "/login" });
                      }}
                      className="w-full cursor-pointer px-4 py-2 text-left text-sm hover:bg-gray-100"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href={signInCta.href}
                className="inline-block cursor-pointer rounded-xl bg-gradient-to-br from-primary to-primary/50 px-3 py-2 text-xs font-bold text-on-primary shadow-lg transition-all duration-300 hover:from-primary hover:to-primary sm:px-4 sm:py-2.5 sm:text-sm lg:px-5"
              >
                {signInCta.text}
              </Link>
            )}

            <button
              type="button"
              className="inline-flex cursor-pointer rounded-lg p-2 transition-transform duration-200 active:scale-95 lg:hidden"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label={open ? "Close menu" : "Open menu"}
            >
              {open ? <IconClose /> : <IconMenu />}
            </button>
          </div>
        </div>

        {/* MOBILE MENU — dropdown attached to navbar */}
        <div
          className={cn(
            "absolute left-0 right-0 top-full z-50 grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-in-out lg:hidden",
            open
              ? "grid-rows-[1fr] opacity-100"
              : "pointer-events-none grid-rows-[0fr] opacity-0",
          )}
          aria-hidden={!open}
        >
          <div className="overflow-hidden">
            <nav className="max-h-[min(70dvh,32rem)] overflow-y-auto rounded-b-md border border-t-0 border-border/60 bg-surface px-4 py-4 shadow-[var(--shadow-header)] md:rounded-b-2xl">
              <div className="flex flex-col gap-1">
                <MobileNavLink
                  href={homeItem.href}
                  label={homeItem.label}
                  pathname={pathname}
                  onNavigate={() => setOpen(false)}
                />
                <ResourcesNavDropdown
                  pathname={pathname}
                  variant="mobile"
                  mobileMenuOpen={open}
                  onNavigate={() => setOpen(false)}
                />
                {enrollNavEnabled ? (
                  <MobileNavLink
                    href={enrollItem.href}
                    label={enrollItem.label}
                    pathname={pathname}
                    onNavigate={() => setOpen(false)}
                  />
                ) : null}
                {coursesNavEnabled ? (
                  <MobileNavLink
                    href={coursesItem.href}
                    label={coursesItem.label}
                    pathname={pathname}
                    onNavigate={() => setOpen(false)}
                  />
                ) : null}
                <MobileNavLink
                  href={blogItem.href}
                  label={blogItem.label}
                  pathname={pathname}
                  onNavigate={() => setOpen(false)}
                />
                <MobileNavLink
                  href={aboutItem.href}
                  label={aboutItem.label}
                  pathname={pathname}
                  onNavigate={() => setOpen(false)}
                />
                <MobileNavLink
                  href={contactItem.href}
                  label={contactItem.label}
                  pathname={pathname}
                  onNavigate={() => setOpen(false)}
                />
              </div>

              <HeaderSocialLinks
                cmsData={cmsData}
                className="mt-4 justify-center gap-6 border-t border-border/60 pt-4"
              />
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, label, pathname }: { href: string; label: string; pathname: string }) {
  const active =
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      className={cn(
        "shrink-0 whitespace-nowrap border-b-2 py-1 text-sm font-semibold xl:text-base",
        active
          ? "border-primary text-primary"
          : "border-transparent text-muted-foreground hover:text-primary",
      )}
    >
      {label}
    </Link>
  );
}

function MobileNavLink({
  href,
  label,
  pathname,
  onNavigate,
}: {
  href: string;
  label: string;
  pathname: string;
  onNavigate: () => void;
}) {
  const active =
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        "rounded-lg px-3 py-3 text-base font-medium transition-colors duration-200",
        active
          ? "bg-surface-container text-primary"
          : "hover:bg-surface-container",
      )}
    >
      {label}
    </Link>
  );
}

function IconMenu() {
  return (
    <svg width="24" height="24" fill="none">
      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="24" height="24" fill="none">
      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

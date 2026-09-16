"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { LuChevronDown } from "react-icons/lu";
import { cn } from "@/lib/cn";
import { RESOURCE_TABS, isResourcePublicPath } from "@/lib/resources/config";

type ResourcesNavDropdownProps = {
  pathname: string;
  variant: "desktop" | "mobile";
  onNavigate?: () => void;
  mobileMenuOpen?: boolean;
};

export function ResourcesNavDropdown({
  pathname,
  variant,
  onNavigate,
  mobileMenuOpen,
}: ResourcesNavDropdownProps) {
  const [open, setOpen] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = isResourcePublicPath(pathname);

  useEffect(() => {
    if (variant !== "desktop") return;
    const handleClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [variant]);

  useEffect(() => {
    if (mobileMenuOpen === false) {
      setMobileExpanded(false);
    }
  }, [mobileMenuOpen]);

  if (variant === "mobile") {
    return (
      <div className="rounded-lg">
        <button
          type="button"
          onClick={() => setMobileExpanded((current) => !current)}
          className={cn(
            "flex w-full cursor-pointer items-center justify-between rounded-lg px-3 py-3 text-base font-medium transition-colors duration-200",
            active || mobileExpanded
              ? "bg-surface-container text-primary"
              : "hover:bg-surface-container",
          )}
          aria-expanded={mobileExpanded}
        >
          Resources
          <LuChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-300 ease-in-out",
              mobileExpanded && "rotate-180",
            )}
            aria-hidden
          />
        </button>
        <div
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-300 ease-in-out",
            mobileExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
          )}
        >
          <div className="overflow-hidden">
            <div className="space-y-0.5 pb-1 pt-0.5">
              {RESOURCE_TABS.map((tab) => {
                const itemActive = pathname === tab.publicHref;
                return (
                  <Link
                    key={tab.id}
                    href={tab.publicHref}
                    onClick={onNavigate}
                    className={cn(
                      "block rounded-lg py-2.5 pl-6 pr-3 text-base font-medium transition-colors duration-200",
                      itemActive
                        ? "bg-surface-container text-primary"
                        : "text-muted-foreground hover:bg-surface-container hover:text-foreground",
                    )}
                  >
                    {tab.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex cursor-pointer items-center gap-1 border-b-2 py-1 text-base font-semibold transition-colors duration-200",
          active
            ? "border-primary text-primary"
            : "border-transparent text-muted-foreground hover:text-primary",
        )}
        aria-expanded={open}
        aria-haspopup="true"
      >
        Resources
        <LuChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform duration-300 ease-in-out",
            open && "rotate-180",
          )}
          aria-hidden
        />
      </button>

      <div
        className={cn(
          "absolute left-0 top-full z-50 mt-2 min-w-[12rem] origin-top overflow-hidden rounded-md border border-border bg-white shadow-lg transition-all duration-200 ease-in-out",
          open
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-1 scale-95 opacity-0",
        )}
      >
        {RESOURCE_TABS.map((tab) => (
          <Link
            key={tab.id}
            href={tab.publicHref}
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
            className={cn(
              "block px-4 py-2.5 text-sm transition-colors duration-200 hover:bg-gray-100",
              pathname === tab.publicHref &&
                "bg-surface-container font-semibold text-primary",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { siteThemeClassName, type SiteTheme } from "@/lib/siteTheme";

type SiteStatusShellProps = {
  children: ReactNode;
  theme?: SiteTheme;
  className?: string;
};

/** Wraps status pages so public keeps brand blue and dashboards use role accents. */
export function SiteStatusShell({
  children,
  theme = "public",
  className,
}: SiteStatusShellProps) {
  const themeClass = siteThemeClassName(theme);

  return (
    <div
      className={cn(
        "flex min-h-[60vh] flex-col items-center justify-center px-4 py-12 text-center",
        themeClass,
        className,
      )}
    >
      {children}
    </div>
  );
}

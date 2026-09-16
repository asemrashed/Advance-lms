export type SiteTheme = "public" | "student" | "instructor" | "admin";

export function siteThemeClassName(theme: SiteTheme = "public"): string | undefined {
  switch (theme) {
    case "student":
      return "student-theme";
    case "instructor":
      return "instructor-theme";
    case "admin":
    case "public":
    default:
      return undefined;
  }
}

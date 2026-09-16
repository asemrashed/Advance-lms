export type ResourceTabId =
  | "notes"
  | "worksheets"
  | "test-yourself"
  | "past-papers";

export type ResourceTab = {
  id: ResourceTabId;
  label: string;
  publicHref: string;
  studentHref: string;
  adminHref: string;
  /** @deprecated Phase 3 — platform resources are admin-only; instructors use course materials. */
  instructorHref?: string;
  description: string;
};

export const RESOURCE_TABS: ResourceTab[] = [
  {
    id: "notes",
    label: "Notes",
    publicHref: "/resources/notes",
    studentHref: "/student/resources/notes",
    adminHref: "/admin/resources/notes",
    description: "Subject and topic PDF notes for your studies.",
  },
  {
    id: "worksheets",
    label: "Topical Worksheets",
    publicHref: "/resources/worksheets",
    studentHref: "/student/resources/worksheets",
    adminHref: "/admin/resources/worksheets",
    description: "Practice worksheets assembled from the course question bank.",
  },
  {
    id: "test-yourself",
    label: "Test Yourself",
    publicHref: "/resources/test-yourself",
    studentHref: "/student/resources/test-yourself",
    adminHref: "/admin/resources/test-yourself",
    description:
      "Quick MCQ practice from the platform question bank. Preview free; full access for batch students.",
  },
  {
    id: "past-papers",
    label: "Past Papers",
    publicHref: "/resources/past-papers",
    studentHref: "/student/resources/past-papers",
    adminHref: "/admin/resources/past-papers",
    description:
      "Past exam question papers in PDF. Free for everyone to view and download.",
  },
];

export const RESOURCE_STUDENT_DEFAULT_HREF = "/student/resources/notes";

export const RESOURCE_PUBLIC_PATHS = RESOURCE_TABS.map((t) => t.publicHref);

export function isResourcePublicPath(pathname: string): boolean {
  return RESOURCE_PUBLIC_PATHS.some(
    (href) => pathname === href || pathname.startsWith(`${href}/`),
  );
}

export function getResourceTabByStudentHref(
  pathname: string,
): ResourceTab | undefined {
  return RESOURCE_TABS.find(
    (t) =>
      pathname === t.studentHref || pathname.startsWith(`${t.studentHref}/`),
  );
}

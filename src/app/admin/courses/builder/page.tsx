import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Course builder",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

/** Legacy bookmarks: /admin/courses/builder?id=... → Curriculum Builder. */
export default async function AdminCourseBuilderRoutePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const courseId = firstParam(params.id) || firstParam(params.courseId);
  const batchId = firstParam(params.batchId);

  const qs = new URLSearchParams();
  if (courseId) qs.set("courseId", courseId);
  if (batchId) qs.set("batchId", batchId);
  const query = qs.toString();
  redirect(query ? `/admin/materials?${query}` : "/admin/materials");
}

/** Build a deep link into a batch from academic-hub list rows. */
export function batchDeepLink(batchesHref: string, batchId: string): string {
  const id = encodeURIComponent(batchId);
  const base = batchesHref.trim() || "/student/courses";

  if (
    base === "/student/batches" ||
    base.startsWith("/student/batches/") ||
    base === "/student/courses" ||
    base.startsWith("/student/courses")
  ) {
    return `/student/courses?tab=live&batchId=${id}`;
  }

  if (base.includes("?")) {
    return `${base}&batchId=${id}`;
  }

  if (base.includes("/materials") || /\/courses\/?$/.test(base)) {
    return `${base}?batchId=${id}`;
  }

  return `${base.replace(/\/$/, "")}/${id}`;
}

import { notFound } from "next/navigation";
import { getWebsiteContent } from "@/lib/website-content";
import { isRecordedCoursesEnabled } from "@/lib/studentPortalSettings";

export default async function RecordedCourseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const content = await getWebsiteContent();
  if (!isRecordedCoursesEnabled(content)) {
    notFound();
  }

  return children;
}

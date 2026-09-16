import { redirect } from "next/navigation";
import { getWebsiteContent } from "@/lib/website-content";
import {
  isRecordedCoursesEnabled,
  PUBLIC_ENROLL_HREF,
  RECORDED_COURSES_CATALOG_HREF,
} from "@/lib/studentPortalSettings";

/** Student browse-courses route removed — redirect based on CMS recorded-course visibility. */
export default async function StudentBrowseCoursesPage() {
  const content = await getWebsiteContent();

  redirect(
    isRecordedCoursesEnabled(content)
      ? RECORDED_COURSES_CATALOG_HREF
      : PUBLIC_ENROLL_HREF,
  );
}

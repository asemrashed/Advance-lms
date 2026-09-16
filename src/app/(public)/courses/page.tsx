import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CoursesCatalogClient } from "@/app/courses/CoursesCatalogClient";
import { PublicCourseBrowseSkeleton } from "@/components/skeletons/LiveEnrollSkeleton";
import { getWebsiteContent } from "@/lib/website-content";
import { isRecordedCoursesEnabled } from "@/lib/studentPortalSettings";

export const metadata: Metadata = {
  title: "Recorded Courses",
  description: "Browse and enroll in recorded courses",
};

export default async function CoursesPage() {
  const content = await getWebsiteContent();
  if (!isRecordedCoursesEnabled(content)) {
    notFound();
  }

  return (
    <Suspense
      fallback={
        <PublicCourseBrowseSkeleton label="Loading recorded courses" />
      }
    >
      <CoursesCatalogClient />
    </Suspense>
  );
}

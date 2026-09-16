import type { Metadata } from "next";
import { Suspense } from "react";
import StudentCourses from "./StudentCoursesClient";
import { RoleAreaPageSkeleton } from "@/components/skeletons/DashboardSkeletons";

export const metadata: Metadata = {
  title: "Courses",
};

export default function StudentCoursesPage() {
  return (
    <Suspense fallback={<RoleAreaPageSkeleton />}>
      <StudentCourses />
    </Suspense>
  );
}

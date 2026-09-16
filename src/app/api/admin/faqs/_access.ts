import { NextResponse } from "next/server";
import Course from "@/models/Course";
import CourseFAQ from "@/models/CourseFAQ";
import { canManageCourse } from "@/app/api/_lib/courseAccess";
import type { SessionUser } from "@/app/api/_lib/phase12";
import { isAdminAreaRole } from "@/lib/roles";

export async function assertCanManageCourseFaqs(
  user: SessionUser,
  courseId: string,
): Promise<NextResponse | null> {
  if (!courseId) {
    return NextResponse.json(
      { success: false, error: "Course is required" },
      { status: 400 },
    );
  }

  if (isAdminAreaRole(user.role)) return null;

  const course = await Course.findById(courseId)
    .select("instructor createdBy")
    .lean();
  if (!course) {
    return NextResponse.json(
      { success: false, error: "Course not found" },
      { status: 404 },
    );
  }

  if (!canManageCourse(course, user.id, user.role)) {
    return NextResponse.json(
      { success: false, error: "You do not have access to this course" },
      { status: 403 },
    );
  }

  return null;
}

export async function assertCanManageFaqById(
  user: SessionUser,
  faqId: string,
): Promise<{ error: NextResponse } | { faq: { course: unknown } }> {
  const faq = await CourseFAQ.findById(faqId).select("course").lean();
  if (!faq) {
    return {
      error: NextResponse.json(
        { success: false, error: "FAQ not found" },
        { status: 404 },
      ),
    };
  }

  const denied = await assertCanManageCourseFaqs(user, String(faq.course));
  if (denied) return { error: denied };
  return { faq };
}

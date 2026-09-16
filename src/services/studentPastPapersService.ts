import { getMyEnrollments } from "@/lib/api/enrollmentClient";
import { getPastPapers } from "@/lib/api/pastPapersClient";
import type { PastPaperRow } from "@/types/pastPaper";
import type { EnrollmentListData } from "@/types/enrollmentList";

function enrollmentCourseIds(data: EnrollmentListData): Set<string> {
  const ids = new Set<string>();
  for (const e of data.enrollments) {
    if (e.course) ids.add(String(e.course));
  }
  return ids;
}

/**
 * Student past-papers: server filters by enrollment for student role;
 * client still derives enrollment metadata for download eligibility UI.
 */
export const studentPastPapersService = {
  async load(): Promise<{
    enrollmentData: EnrollmentListData;
    pastPapers: PastPaperRow[];
    enrolledCourseIds: string[];
  }> {
    const enr = await getMyEnrollments();
    const enrollmentData: EnrollmentListData = {
      enrollments: enr.data.enrollments,
      pagination: {
        page: 1,
        limit: enr.data.enrollments.length,
        total: enr.data.enrollments.length,
        pages: enr.data.enrollments.length > 0 ? 1 : 0,
        hasNext: false,
        hasPrev: false,
      },
      stats: {
        total: enr.data.enrollments.length,
        active: enr.data.enrollments.filter((e) =>
          ["enrolled", "in_progress", "completed"].includes(
            String(e.status || "").toLowerCase(),
          ),
        ).length,
        completed: enr.data.enrollments.filter((e) => e.status === "completed")
          .length,
        dropped: enr.data.enrollments.filter((e) => e.status === "dropped")
          .length,
        suspended: enr.data.enrollments.filter((e) => e.status === "suspended")
          .length,
        paid: enr.data.enrollments.filter((e) => e.paymentStatus === "paid")
          .length,
        pending: enr.data.enrollments.filter((e) => e.paymentStatus === "pending")
          .length,
        failed: enr.data.enrollments.filter((e) => e.paymentStatus === "failed")
          .length,
        totalRevenue: 0,
        averageProgress:
          enr.data.enrollments.length > 0
            ? enr.data.enrollments.reduce((sum, e) => sum + (e.progress ?? 0), 0) /
              enr.data.enrollments.length
            : 0,
        completionRate: 0,
        dropRate: 0,
      },
    };
    const enrolledCourseIds = [...enrollmentCourseIds(enrollmentData)];
    const { pastPapers } = await getPastPapers({ page: 1, limit: 200 });
    return { enrollmentData, pastPapers, enrolledCourseIds };
  },
};

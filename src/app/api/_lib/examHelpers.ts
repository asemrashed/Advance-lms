/**
 * Shared exam create/update helpers: live-course access, metadata, publish rules.
 */
import Course from "@/models/Course";
import Question from "@/models/Question";
import { isObjectId, toObjectId } from "@/app/api/_lib/phase12";
import { questionTypeAllowedForExam } from "@/lib/examQuestionsCsv";
import { validateExamDateOrder } from "@/lib/examValidation";

export { validateExamDateOrder };

export type LiveCourseMeta = {
  courseId: string;
  subjectId?: string;
  subjectName?: string;
  subjectCode?: string;
  grade?: string;
};

export async function resolveLiveCourseForStaff(params: {
  courseId: string;
  userId: string;
  role: "admin" | "instructor" | string;
}): Promise<{ ok: true; meta: LiveCourseMeta } | { ok: false; error: string; status: number }> {
  const { courseId, userId, role } = params;
  if (!isObjectId(courseId)) {
    return { ok: false, error: "Valid live course is required", status: 400 };
  }

  const course = await Course.findById(courseId)
    .select("_id title courseType instructor createdBy subjectId subjectName subjectCode grade")
    .lean();

  if (!course) {
    return { ok: false, error: "Course not found", status: 404 };
  }

  const courseType = String((course as { courseType?: string }).courseType || "");
  if (courseType && courseType !== "live") {
    return { ok: false, error: "Exam must be linked to a live course", status: 400 };
  }

  if (role === "instructor") {
    const instructorId = String((course as { instructor?: unknown }).instructor || "");
    const createdBy = String((course as { createdBy?: unknown }).createdBy || "");
    if (instructorId !== userId && createdBy !== userId) {
      return { ok: false, error: "You do not have access to this course", status: 403 };
    }
  }

  const c = course as {
    subjectId?: unknown;
    subjectName?: string;
    subjectCode?: string;
    grade?: string;
  };

  return {
    ok: true,
    meta: {
      courseId: String((course as { _id: unknown })._id),
      subjectId: c.subjectId ? String(c.subjectId) : undefined,
      subjectName: c.subjectName?.trim() || undefined,
      subjectCode: c.subjectCode?.trim()?.toUpperCase() || undefined,
      grade: c.grade?.trim()?.toUpperCase() || undefined,
    },
  };
}

export async function assertCanAttachToExam(params: {
  examId: string;
  userId: string;
  role: "admin" | "instructor" | string;
  examAccessMatch?: Record<string, unknown>;
}): Promise<
  | {
      ok: true;
      exam: {
        _id: unknown;
        type: "mcq" | "written" | "mixed";
        questions?: unknown[];
        totalMarks?: number;
        passingMarks?: number;
      };
    }
  | { ok: false; error: string; status: number }
> {
  const Exam = (await import("@/models/Exam")).default;
  const { examId, role, examAccessMatch } = params;
  if (!isObjectId(examId)) {
    return { ok: false, error: "Invalid exam id", status: 400 };
  }

  const examOid = toObjectId(examId);
  let exam: Record<string, unknown> | null = null;
  if (role === "instructor" && examAccessMatch) {
    exam = (await Exam.findOne({ $and: [{ _id: examOid }, examAccessMatch] }).lean()) as Record<
      string,
      unknown
    > | null;
  } else {
    exam = (await Exam.findById(examOid).lean()) as Record<string, unknown> | null;
  }

  if (!exam) {
    return { ok: false, error: "Exam not found or access denied", status: 404 };
  }

  return {
    ok: true,
    exam: {
      _id: exam._id,
      type: (exam.type as "mcq" | "written" | "mixed") || "mcq",
      questions: Array.isArray(exam.questions) ? exam.questions : [],
      totalMarks: Number(exam.totalMarks || 0),
      passingMarks: Number(exam.passingMarks || 0),
    },
  };
}

export function assertQuestionTypesForExam(
  examType: "mcq" | "written" | "mixed",
  types: string[],
): string | null {
  for (const t of types) {
    if (
      !questionTypeAllowedForExam(
        examType,
        t as "mcq" | "written" | "true_false" | "fill_blank" | "essay",
      )
    ) {
      return `Question type "${t}" is not allowed for ${examType} exams`;
    }
  }
  return null;
}

/** Sum marks for questions attached to an exam and optionally update totalMarks. */
export async function reconcileExamTotalMarks(examId: string): Promise<number> {
  const Exam = (await import("@/models/Exam")).default;
  const rows = await Question.find({ exam: toObjectId(examId) }).select("marks").lean();
  const total = rows.reduce((sum, q) => sum + Number((q as { marks?: number }).marks || 0), 0);
  await Exam.findByIdAndUpdate(examId, { totalMarks: total });
  return total;
}

export async function assertCanPublishExam(examId: string): Promise<string | null> {
  const count = await Question.countDocuments({ exam: toObjectId(examId), isActive: { $ne: false } });
  if (count < 1) return "Add at least one question before publishing";
  return null;
}

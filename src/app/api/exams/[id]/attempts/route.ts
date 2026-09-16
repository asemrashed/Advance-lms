import { NextRequest, NextResponse } from "next/server";
import Exam from "@/models/Exam";
import ExamAttempt from "@/models/ExamAttempt";
import {
  instructorExamAccessMatch,
  isObjectId,
  normalizeStudentName,
  pagination,
  parseLimit,
  parsePage,
  requireSessionUser,
  toObjectId,
} from "@/app/api/_lib/phase12";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

function mapStudent(st: unknown) {
  const s = st as { _id?: unknown; name?: string; firstName?: string; lastName?: string; email?: string } | null;
  if (!s || typeof s !== "object") {
    return { _id: "", name: "Unknown", email: "" };
  }
  return {
    _id: String(s._id ?? ""),
    name: normalizeStudentName(s),
    email: String(s.email || ""),
  };
}

export async function GET(request: NextRequest, ctx: RouteCtx) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;

    const { id } = await ctx.params;
    if (!isObjectId(id)) {
      return NextResponse.json({ success: false, error: "Invalid exam id" }, { status: 400 });
    }

    const examOid = toObjectId(id);
    let exam: { title?: string } | null = null;
    if (auth.user.role === "instructor") {
      const scope = await instructorExamAccessMatch(auth.user.id);
      exam = await Exam.findOne({ $and: [{ _id: examOid }, scope] }).select("title").lean();
    } else {
      exam = await Exam.findOne({ _id: examOid }).select("title").lean();
    }
    if (!exam) {
      return NextResponse.json({ success: false, error: "Exam not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const status = (searchParams.get("status") || "").trim();
    const sortByRaw = (searchParams.get("sortBy") || "createdAt").trim();
    const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;
    const page = parsePage(searchParams);
    const limit = parseLimit(searchParams, 20, 200);
    const skip = (page - 1) * limit;

    const sortField =
      sortByRaw === "submittedAt" || sortByRaw === "submitted"
        ? "submittedAt"
        : sortByRaw === "percentage" || sortByRaw === "score"
          ? "percentage"
          : sortByRaw === "marksObtained"
            ? "marksObtained"
            : "createdAt";
    const sort: Record<string, 1 | -1> = { [sortField]: sortOrder };

    const attemptFilter: Record<string, unknown> = { exam: examOid };
    if (status && status !== "all") attemptFilter.status = status;

    const [rows, total, facet] = await Promise.all([
      ExamAttempt.find(attemptFilter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate("student", "name email phone")
        .lean(),
      ExamAttempt.countDocuments(attemptFilter),
      ExamAttempt.aggregate([
        { $match: { exam: examOid } },
        {
          $facet: {
            meta: [
              {
                $group: {
                  _id: null,
                  totalAttempts: { $sum: 1 },
                  completedAttempts: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
                  inProgressAttempts: { $sum: { $cond: [{ $eq: ["$status", "in_progress"] }, 1, 0] } },
                },
              },
            ],
            graded: [
              { $match: { exam: examOid, status: "completed" } },
              {
                $group: {
                  _id: null,
                  averageScore: { $avg: "$percentage" },
                  passedAttempts: { $sum: { $cond: ["$isPassed", 1, 0] } },
                },
              },
            ],
          },
        },
      ]),
    ]);

    const facetRow = (facet as Array<{ meta: Array<Record<string, number>>; graded: Array<Record<string, number>> }>)[0];
    const meta = facetRow?.meta?.[0] || {};
    const graded = facetRow?.graded?.[0] || {};
    const completed = Number(meta.completedAttempts || 0);
    const passRate =
      completed > 0 ? Number((((graded.passedAttempts || 0) / completed) * 100).toFixed(2)) : 0;

    const attempts = rows.map((a) => {
      const student = mapStudent(a.student);
      return {
        _id: String(a._id),
        exam: String(a.exam),
        student,
        status: a.status,
        score: typeof a.marksObtained === "number" ? a.marksObtained : 0,
        maxScore: typeof a.totalMarks === "number" ? a.totalMarks : 0,
        percentage: typeof a.percentage === "number" ? a.percentage : 0,
        marksObtained: typeof a.marksObtained === "number" ? a.marksObtained : 0,
        attemptNumber: a.attemptNumber,
        submittedAt: a.submittedAt ? new Date(a.submittedAt).toISOString() : undefined,
        startedAt: a.startTime ? new Date(a.startTime).toISOString() : undefined,
        isPassed: Boolean(a.isPassed),
        isLate: false,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        attempts,
        pagination: pagination(page, limit, total),
        stats: {
          totalAttempts: Number(meta.totalAttempts || 0),
          completedAttempts: completed,
          inProgressAttempts: Number(meta.inProgressAttempts || 0),
          averageScore: Number(graded.averageScore || 0),
          passRate,
        },
      },
    });
  } catch (error) {
    console.error("Exam attempts list GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch exam attempts" }, { status: 500 });
  }
}

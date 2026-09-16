import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Exam from "@/models/Exam";
import ExamAttempt from "@/models/ExamAttempt";
import { studentCanAccessCourse } from "@/app/api/_lib/studentCourseAccess";
import { parseLimit, parsePage, pagination, requireSessionUser, toObjectId } from "@/app/api/_lib/phase12";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSessionUser(["student"]);
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const examId = (searchParams.get("examId") || "").trim();
    const status = (searchParams.get("status") || "").trim();
    const submittedResults = (searchParams.get("submitted") || "").trim() === "1";
    const page = parsePage(searchParams);
    const limit = parseLimit(searchParams, 20, 200);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { student: toObjectId(auth.user.id) };
    if (examId && mongoose.Types.ObjectId.isValid(examId)) {
      filter.exam = new mongoose.Types.ObjectId(examId);
    }
    if (submittedResults) {
      filter.status = { $in: ["completed", "pending_review"] };
    } else if (status && status !== "all") {
      filter.status = status;
    }

    const [rows, total] = await Promise.all([
      ExamAttempt.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      ExamAttempt.countDocuments(filter),
    ]);

    const examIds = Array.from(new Set(rows.map((a) => String(a.exam))));
    const examOidList = examIds
      .filter((eid) => mongoose.Types.ObjectId.isValid(eid))
      .map((eid) => new mongoose.Types.ObjectId(eid));
    const examDocs = examOidList.length
      ? await Exam.find({ _id: { $in: examOidList } })
          .select("title type duration totalMarks passingMarks")
          .lean()
      : [];
    const examById = new Map(examDocs.map((exam) => [String(exam._id), exam]));

    const attempts = rows.map((a) => {
      const ex = examById.get(String(a.exam));
      const totalSeconds = (ex?.duration || 60) * 60;
      const spent = Number(a.timeSpent || 0);
      const remainingSeconds = a.status === "in_progress" ? Math.max(0, totalSeconds - spent) : undefined;
      const scoresReleased = a.status === "completed";
      return {
        _id: String(a._id),
        examId: String(a.exam),
        exam: {
          _id: String(ex?._id || a.exam),
          title: ex?.title || "Exam",
          type: ex?.type || "exam",
          duration: ex?.duration || 0,
          totalMarks: Number(ex?.totalMarks ?? a.totalMarks ?? 0),
          passingMarks: Number(ex?.passingMarks ?? 0),
        },
        student: String(a.student),
        status: a.status,
        scoresReleased,
        score: scoresReleased ? a.marksObtained : null,
        percentage: scoresReleased ? a.percentage : null,
        passed: scoresReleased ? a.isPassed : null,
        timeSpent: a.timeSpent,
        answers: (a.answers || []).map((ans: Record<string, unknown>) => ({
          questionId: String(ans.question),
          answer: Array.isArray(ans.selectedOptions) && (ans.selectedOptions as unknown[]).length
            ? ans.selectedOptions
            : ans.writtenAnswer || "",
          isCorrect: ans.isCorrect,
          marks: ans.marksObtained,
          gradingStatus: ans.gradingStatus,
        })),
        startedAt: a.startTime,
        completedAt: a.submittedAt,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt,
        ...(remainingSeconds !== undefined ? { remainingSeconds } : {}),
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        attempts,
        pagination: pagination(page, limit, total),
      },
    });
  } catch (error) {
    console.error("Student exam attempts GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch exam attempts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSessionUser(["student"]);
    if (auth.error) return auth.error;
    const body = (await request.json()) as { examId?: string };
    const examId = String(body.examId || "");
    if (!mongoose.Types.ObjectId.isValid(examId)) {
      return NextResponse.json({ success: false, error: "Invalid examId" }, { status: 400 });
    }

    const exam = await Exam.findById(examId).lean();
    if (!exam || !exam.isActive || !exam.isPublished) {
      return NextResponse.json({ success: false, error: "Exam not found" }, { status: 404 });
    }
    if (exam.course) {
      const allowed = await studentCanAccessCourse(auth.user.id, exam.course);
      if (!allowed) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      }
    }

    const latest = await ExamAttempt.findOne({
      exam: exam._id,
      student: toObjectId(auth.user.id),
      status: "in_progress",
    })
      .sort({ createdAt: -1 })
      .lean();

    if (latest) {
      const totalSeconds = (exam.duration || 60) * 60;
      const spent = Number(latest.timeSpent || 0);
      return NextResponse.json({
        success: true,
        data: {
          attempt: {
            _id: String(latest._id),
            exam: String(latest.exam),
            student: String(latest.student),
            status: latest.status,
            answers: (latest.answers || []).map((ans: any) => ({
              questionId: String(ans.question),
              answer: ans.selectedOptions?.length ? ans.selectedOptions : ans.writtenAnswer || "",
            })),
            startedAt: latest.startTime,
            timeSpent: latest.timeSpent,
          },
          remainingSeconds: Math.max(0, totalSeconds - spent),
        },
      });
    }

    const previousAttempts = await ExamAttempt.countDocuments({
      exam: exam._id,
      student: toObjectId(auth.user.id),
    });
    const maxAttempts = Math.max(1, Number(exam.attempts) || 1);
    if (previousAttempts >= maxAttempts) {
      return NextResponse.json(
        {
          success: false,
          error: `Maximum exam attempts (${maxAttempts}) reached. You cannot start another attempt.`,
        },
        { status: 403 },
      );
    }

    const attemptNumber = previousAttempts + 1;

    const created = await ExamAttempt.create({
      exam: exam._id,
      student: toObjectId(auth.user.id),
      answers: [],
      totalMarks: exam.totalMarks,
      marksObtained: 0,
      percentage: 0,
      isPassed: false,
      status: "in_progress",
      startTime: new Date(),
      timeSpent: 0,
      isSubmitted: false,
      attemptNumber,
      ipAddress: request.headers.get("x-forwarded-for") || "",
      userAgent: request.headers.get("user-agent") || "",
    });

    return NextResponse.json({
      success: true,
      data: {
        attempt: {
          _id: String(created._id),
          exam: String(created.exam),
          student: String(created.student),
          status: created.status,
          answers: [],
          startedAt: created.startTime,
          timeSpent: created.timeSpent,
        },
        remainingSeconds: (exam.duration || 60) * 60,
      },
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      return NextResponse.json(
        { success: false, error: "Attempt already exists for this attempt number" },
        { status: 409 },
      );
    }
    console.error("Student exam attempts POST error:", error);
    return NextResponse.json({ success: false, error: "Failed to create exam attempt" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Assignment from "@/models/Assignment";
import AssignmentSubmission from "@/models/AssignmentSubmission";
import { studentCanAccessCourse } from "@/app/api/_lib/studentCourseAccess";
import { isObjectId, requireSessionUser } from "@/app/api/_lib/phase12";
import {
  isPdfSubmissionFile,
  normalizeMcqQuestions,
  scoreMcqSubmission,
  type SubmissionFileInput,
} from "@/lib/assignments/validation";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

function parseSubmissionBody(body: Record<string, unknown>) {
  return {
    content: String(body.content || "").trim() || undefined,
    files: Array.isArray(body.files) ? (body.files as SubmissionFileInput[]) : [],
    answers: Array.isArray(body.answers) ? body.answers : [],
    timeSpent:
      typeof body.timeSpent === "number" && Number.isFinite(body.timeSpent) ? body.timeSpent : undefined,
  };
}

function isPdfAssignmentType(type: string) {
  return type === "pdf" || type === "file_upload";
}

export async function POST(request: NextRequest, ctx: RouteCtx) {
  try {
    const auth = await requireSessionUser(["student"]);
    if (auth.error) return auth.error;
    const { id } = await ctx.params;
    if (!isObjectId(id)) return NextResponse.json({ success: false, error: "Invalid id" }, { status: 400 });

    const assignment = await Assignment.findById(id).lean();
    if (!assignment || !assignment.isActive || !assignment.isPublished) {
      return NextResponse.json({ success: false, error: "Assignment not found" }, { status: 404 });
    }
    const canAccess = await studentCanAccessCourse(auth.user.id, assignment.course);
    if (!canAccess) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

    const body = (await request.json()) as Record<string, unknown>;
    const payload = parseSubmissionBody(body);
    const assignmentType = String(assignment.type || "");

    if (assignmentType === "mcq") {
      const questions = normalizeMcqQuestions((assignment as { mcqQuestions?: unknown }).mcqQuestions);
      if (questions.length === 0) {
        return NextResponse.json(
          { success: false, error: "Assignment has no MCQ questions configured" },
          { status: 400 },
        );
      }
      if (payload.answers.length === 0) {
        return NextResponse.json(
          { success: false, error: "Please answer all required questions" },
          { status: 400 },
        );
      }
    } else if (isPdfAssignmentType(assignmentType)) {
      if (payload.files.length === 0) {
        return NextResponse.json(
          { success: false, error: "A PDF file is required for this assignment" },
          { status: 400 },
        );
      }
      const nonPdf = payload.files.filter((f) => !isPdfSubmissionFile(f));
      if (nonPdf.length > 0) {
        return NextResponse.json(
          { success: false, error: "Only PDF files are allowed for this assignment" },
          { status: 400 },
        );
      }
      const maxMb = Number(assignment.maxFileSize || 20);
      const oversized = payload.files.filter((f) => Number(f.size || 0) > maxMb * 1024 * 1024);
      if (oversized.length > 0) {
        return NextResponse.json(
          { success: false, error: `PDF must be ${maxMb}MB or smaller` },
          { status: 400 },
        );
      }
    } else if (!payload.content && payload.files.length === 0 && payload.answers.length === 0) {
      return NextResponse.json(
        { success: false, error: "Submission must include content, file, or answers" },
        { status: 400 },
      );
    }

    const attempts = await AssignmentSubmission.countDocuments({
      assignment: new mongoose.Types.ObjectId(id),
      student: new mongoose.Types.ObjectId(auth.user.id),
    });
    const latestSubmission = await AssignmentSubmission.findOne({
      assignment: new mongoose.Types.ObjectId(id),
      student: new mongoose.Types.ObjectId(auth.user.id),
    })
      .sort({ attemptNumber: -1 })
      .lean();
    const attemptNumber = attempts + 1;
    const maxAttempts = Number(assignment.maxAttempts || 1);
    if (attemptNumber > maxAttempts) {
      return NextResponse.json(
        {
          success: false,
          error: "Maximum assignment attempts exceeded",
          data: {
            attemptsUsed: attempts,
            maxAttempts,
            latestSubmission: latestSubmission || null,
          },
        },
        { status: 400 },
      );
    }

    const due = assignment.dueDate ? new Date(assignment.dueDate) : null;
    const isLate = Boolean(due && Date.now() > due.getTime());
    if (isLate && !assignment.allowLateSubmission) {
      return NextResponse.json({ success: false, error: "Late submission is not allowed" }, { status: 400 });
    }

    const submission = await AssignmentSubmission.create({
      assignment: new mongoose.Types.ObjectId(id),
      student: new mongoose.Types.ObjectId(auth.user.id),
      content: payload.content,
      files: payload.files,
      answers: payload.answers,
      status: "submitted",
      submittedAt: new Date(),
      maxScore: assignment.totalMarks,
      isLate,
      latePenaltyApplied: isLate ? Number(assignment.latePenaltyPercentage || 0) : 0,
      attemptNumber,
      timeSpent: payload.timeSpent,
    });

    if (assignmentType === "mcq" && assignment.autoGrade) {
      const questions = normalizeMcqQuestions((assignment as { mcqQuestions?: unknown }).mcqQuestions);
      const graded = scoreMcqSubmission(questions, payload.answers as Array<{ questionId?: string; answer?: string | string[] }>);
      const maxScore = Number(assignment.totalMarks || graded.maxScore || 1);
      const boundedScore = Math.min(graded.score, maxScore);
      const percentageScore = maxScore > 0 ? Number(((boundedScore / maxScore) * 100).toFixed(2)) : 0;
      submission.status = "graded";
      submission.score = boundedScore;
      submission.maxScore = maxScore;
      submission.percentageScore = percentageScore;
      submission.passed = boundedScore >= Number(assignment.passingMarks || 0);
      submission.gradedAt = new Date();
      submission.answers = graded.gradedAnswers.map((row) => ({
        questionId: row.questionId,
        answer: row.answer,
        isCorrect: row.isCorrect,
      }));
      await submission.save();
    }

    return NextResponse.json({
      success: true,
      data: {
        submission: submission.toObject(),
        attemptNumber,
        attemptsRemaining: Math.max(maxAttempts - attemptNumber, 0),
      },
    });
  } catch (error: any) {
    if (error?.code === 11000) {
      return NextResponse.json({ success: false, error: "Duplicate attempt number" }, { status: 409 });
    }
    console.error("Student assignment submit error:", error);
    return NextResponse.json({ success: false, error: "Failed to submit assignment" }, { status: 500 });
  }
}

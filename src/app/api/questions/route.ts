import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Question from "@/models/Question";
import Exam from "@/models/Exam";
import {
  instructorExamAccessMatch,
  pagination,
  parseLimit,
  parsePage,
  requireSessionUser,
  toObjectId,
  escapeRegex,
} from "@/app/api/_lib/phase12";
import {
  assertCanAttachToExam,
  assertQuestionTypesForExam,
  reconcileExamTotalMarks,
} from "@/app/api/_lib/examHelpers";

function buildQuestionStats(rows: any[]) {
  const byType: Record<string, number> = {};
  const byDifficulty: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  let totalMarks = 0;
  for (const q of rows) {
    byType[q.type] = (byType[q.type] || 0) + 1;
    byDifficulty[q.difficulty] = (byDifficulty[q.difficulty] || 0) + 1;
    const key = q.isActive ? "active" : "inactive";
    byStatus[key] = (byStatus[key] || 0) + 1;
    totalMarks += Number(q.marks || 0);
  }
  return {
    totalQuestions: rows.length,
    activeQuestions: rows.filter((q) => q.isActive !== false).length,
    mcqQuestions: rows.filter((q) => q.type === "mcq").length,
    totalMarks,
    byType,
    byDifficulty,
    byStatus,
  };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const page = parsePage(searchParams);
    const limit = parseLimit(searchParams, 10, 500);
    const skip = (page - 1) * limit;
    const search = (searchParams.get("search") || "").trim();
    const type = (searchParams.get("type") || "").trim();
    const difficulty = (searchParams.get("difficulty") || "").trim();
    const status = (searchParams.get("status") || "").trim();
    const exam = (searchParams.get("exam") || "").trim();
    const sortBy = (searchParams.get("sortBy") || "createdAt").trim();
    const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;

    const filter: Record<string, unknown> = {};
    if (auth.user.role === "instructor") {
      filter.createdBy = toObjectId(auth.user.id);
    }
    if (search) filter.question = { $regex: escapeRegex(search), $options: "i" };
    if (type && type !== "all") filter.type = type;
    if (difficulty && difficulty !== "all") filter.difficulty = difficulty;
    if (status === "active") filter.isActive = true;
    if (status === "inactive") filter.isActive = false;
    if (exam && mongoose.Types.ObjectId.isValid(exam)) {
      filter.exam = new mongoose.Types.ObjectId(exam);
    }
    const idsParam = (searchParams.get("ids") || "").trim();
    if (idsParam) {
      const ids = idsParam
        .split(",")
        .map((id) => id.trim())
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));
      filter._id = { $in: ids };
    }

    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder };

    const [rows, total] = await Promise.all([
      Question.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Question.countDocuments(filter),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        questions: rows,
        pagination: pagination(page, limit, total),
        stats: buildQuestionStats(rows),
      },
    });
  } catch (error) {
    console.error("Questions GET error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch questions" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;

    const body = (await request.json()) as Record<string, unknown>;
    const text = String(body.question || "").trim();
    if (!text) {
      return NextResponse.json({ success: false, error: "question is required" }, { status: 400 });
    }

    const type =
      body.type === "written" ||
      body.type === "true_false" ||
      body.type === "fill_blank" ||
      body.type === "essay"
        ? body.type
        : "mcq";

    let examOid: mongoose.Types.ObjectId | undefined;
    if (typeof body.exam === "string" && mongoose.Types.ObjectId.isValid(body.exam)) {
      const scope =
        auth.user.role === "instructor"
          ? await instructorExamAccessMatch(auth.user.id)
          : undefined;
      const access = await assertCanAttachToExam({
        examId: body.exam,
        userId: auth.user.id,
        role: auth.user.role,
        examAccessMatch: scope,
      });
      if (!access.ok) {
        return NextResponse.json(
          { success: false, error: access.error },
          { status: access.status },
        );
      }
      const typeError = assertQuestionTypesForExam(access.exam.type, [type]);
      if (typeError) {
        return NextResponse.json({ success: false, error: typeError }, { status: 400 });
      }
      examOid = new mongoose.Types.ObjectId(body.exam);
    }

    const question = await Question.create({
      question: text,
      type,
      marks: Number(body.marks || 1),
      difficulty:
        body.difficulty === "easy" || body.difficulty === "hard" ? body.difficulty : "medium",
      category: String(body.category || "").trim() || undefined,
      tags: Array.isArray(body.tags) ? body.tags : [],
      options: Array.isArray(body.options) ? body.options : [],
      correctAnswer: String(body.correctAnswer || "").trim() || undefined,
      explanation: String(body.explanation || "").trim() || undefined,
      hints: Array.isArray(body.hints) ? body.hints : [],
      timeLimit: Number(body.timeLimit || 0) || undefined,
      isActive: body.isActive !== false,
      createdBy: toObjectId(auth.user.id),
      exam: examOid,
      subjectId:
        typeof body.subjectId === "string" && mongoose.Types.ObjectId.isValid(body.subjectId)
          ? new mongoose.Types.ObjectId(body.subjectId)
          : undefined,
      subject: String(body.subject || "").trim() || undefined,
      subjectCode: String(body.subjectCode || "").trim() || undefined,
      grade: String(body.grade || "").trim() || undefined,
      componentId: String(body.componentId || "").trim() || undefined,
      topic: String(body.topic || "").trim() || undefined,
      subtopic: String(body.subtopic || "").trim() || undefined,
    });

    if (question.exam) {
      await Exam.findByIdAndUpdate(question.exam, { $addToSet: { questions: question._id } });
      await reconcileExamTotalMarks(String(question.exam));
    }

    return NextResponse.json({ success: true, data: question.toObject() });
  } catch (error) {
    console.error("Questions POST error:", error);
    return NextResponse.json({ success: false, error: "Failed to create question" }, { status: 500 });
  }
}

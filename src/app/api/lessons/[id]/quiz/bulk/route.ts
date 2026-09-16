import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import connectDB from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import Lesson from "@/models/Lesson";
import Course from "@/models/Course";
import Question from "@/models/Question";
import { isAdminAreaRole } from "@/lib/roles";

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function canManageLesson(lesson: { course: unknown }, userId: string, role: string) {
  if (isAdminAreaRole(role)) return true;
  const course = await Course.findById(lesson.course)
    .select("_id instructor createdBy")
    .lean();
  if (!course) return false;
  return (
    String(course.instructor || "") === userId ||
    String(course.createdBy || "") === userId
  );
}

function optionsToStrings(options: { text?: string }[] | undefined): string[] {
  return (options || []).map((o) => String(o.text || ""));
}

function mapQuestionToPayload(
  q: Record<string, unknown>,
  lessonId: string,
  courseId: string,
) {
  const opts = (q.options as { text?: string; isCorrect?: boolean }[]) || [];
  const options = optionsToStrings(opts);
  const correctOptionIndex = opts.findIndex((o) => o.isCorrect);
  return {
    _id: String(q._id),
    lesson: lessonId,
    course: courseId,
    question: String(q.question || ""),
    options,
    ...(correctOptionIndex >= 0 ? { correctOptionIndex } : {}),
    explanation: q.explanation ? String(q.explanation) : undefined,
    isActive: q.isActive !== false,
    createdAt: new Date(q.createdAt as Date).toISOString(),
    updatedAt: new Date(q.updatedAt as Date).toISOString(),
  };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const role = session?.user?.role;
    if (!userId || !role) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }
    if (!isAdminAreaRole(role) && role !== "instructor") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    await connectDB();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid lesson ID" },
        { status: 400 },
      );
    }

    const lesson = await Lesson.findById(id).lean();
    if (!lesson) {
      return NextResponse.json(
        { success: false, error: "Lesson not found" },
        { status: 404 },
      );
    }

    const allowed = await canManageLesson(lesson, userId, role);
    if (!allowed) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as {
      questions?: Array<{
        _id?: string;
        question: string;
        options: string[];
        correctOptionIndex: number;
        explanation?: string;
        isActive?: boolean;
      }>;
    };

    if (!Array.isArray(body.questions) || body.questions.length === 0) {
      return NextResponse.json(
        { success: false, error: "questions array is required" },
        { status: 400 },
      );
    }

    const lessonOid = new mongoose.Types.ObjectId(id);
    const createdBy = new mongoose.Types.ObjectId(userId);
    const lessonIdStr = String(lesson._id);
    const courseIdStr = String(lesson.course);

    const results: Record<string, unknown>[] = [];

    for (const raw of body.questions) {
      if (!raw.question?.trim() || !Array.isArray(raw.options) || raw.options.length < 2) {
        return NextResponse.json(
          { success: false, error: "Each question needs text and at least two options" },
          { status: 400 },
        );
      }
      if (
        typeof raw.correctOptionIndex !== "number" ||
        raw.correctOptionIndex < 0 ||
        raw.correctOptionIndex >= raw.options.length
      ) {
        return NextResponse.json(
          { success: false, error: "Invalid correctOptionIndex" },
          { status: 400 },
        );
      }

      const options = raw.options.map((text, i) => ({
        text: String(text).trim(),
        isCorrect: i === raw.correctOptionIndex,
      }));

      if (raw._id && mongoose.Types.ObjectId.isValid(raw._id)) {
        const existing = await Question.findOne({
          _id: raw._id,
          lesson: lessonOid,
        }).lean();
        if (!existing) {
          return NextResponse.json(
            { success: false, error: `Question not found for lesson: ${raw._id}` },
            { status: 400 },
          );
        }
        const updated = await Question.findByIdAndUpdate(
          raw._id,
          {
            $set: {
              question: String(raw.question).trim(),
              options,
              explanation: raw.explanation?.trim() || undefined,
              isActive: raw.isActive !== false,
              type: "mcq",
              marks: 1,
              difficulty: "medium",
            },
          },
          { new: true, runValidators: true },
        ).lean();
        if (updated) {
          results.push(mapQuestionToPayload(updated as Record<string, unknown>, lessonIdStr, courseIdStr));
        }
      } else {
        const created = await Question.create({
          question: String(raw.question).trim(),
          type: "mcq",
          marks: 1,
          difficulty: "medium",
          options,
          explanation: raw.explanation?.trim() || undefined,
          isActive: raw.isActive !== false,
          createdBy,
          lesson: lessonOid,
        });
        results.push(
          mapQuestionToPayload(
            created.toObject() as Record<string, unknown>,
            lessonIdStr,
            courseIdStr,
          ),
        );
      }
    }

    return NextResponse.json({ success: true, data: results });
  } catch (error) {
    console.error("Lesson quiz bulk error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save quiz questions" },
      { status: 500 },
    );
  }
}

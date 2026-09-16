import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import connectDB from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import Lesson from "@/models/Lesson";
import Course from "@/models/Course";
import Question from "@/models/Question";
import { ensureStudentCourseAccess } from "@/app/api/_lib/studentEnrollment";
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
  includeCorrectIndex: boolean,
) {
  const opts = (q.options as { text?: string; isCorrect?: boolean }[]) || [];
  const options = optionsToStrings(opts);
  const correctOptionIndex = opts.findIndex((o) => o.isCorrect);
  const base = {
    _id: String(q._id),
    lesson: lessonId,
    course: courseId,
    question: String(q.question || ""),
    options,
    explanation: q.explanation ? String(q.explanation) : undefined,
    isActive: q.isActive !== false,
    createdAt: new Date(q.createdAt as Date).toISOString(),
    updatedAt: new Date(q.updatedAt as Date).toISOString(),
  };
  if (includeCorrectIndex && correctOptionIndex >= 0) {
    return { ...base, correctOptionIndex };
  }
  return base;
}

function buildQuestionDocs(
  inputs: Array<{
    question: string;
    options: string[];
    correctOptionIndex: number;
    explanation?: string;
    isActive?: boolean;
  }>,
  lessonId: mongoose.Types.ObjectId,
  createdBy: mongoose.Types.ObjectId,
) {
  return inputs.map((raw) => {
    const options = (raw.options || []).map((text, i) => ({
      text: String(text).trim(),
      isCorrect: i === raw.correctOptionIndex,
    }));
    return {
      question: String(raw.question || "").trim(),
      type: "mcq" as const,
      marks: 1,
      difficulty: "medium" as const,
      options,
      explanation: raw.explanation?.trim() || undefined,
      isActive: raw.isActive !== false,
      createdBy,
      lesson: lessonId,
    };
  });
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
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

    const lessonIdStr = String(lesson._id);
    const courseIdStr = String(lesson.course);

    const isStaff = isAdminAreaRole(role) || role === "instructor";
    if (isStaff) {
      const allowed = await canManageLesson(lesson, userId, role);
      if (!allowed) {
        return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
      }
    } else if (role === "student") {
      const access = await ensureStudentCourseAccess(userId, courseIdStr);
      if (!access.ok) {
        return NextResponse.json(
          { success: false, error: access.error },
          { status: access.status },
        );
      }
      if (!lesson.isPublished) {
        return NextResponse.json(
          { success: false, error: "Lesson is not available" },
          { status: 403 },
        );
      }
    } else {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(_request.url);
    const includeInactive =
      isStaff && searchParams.get("includeInactive") === "true";

    const filter: Record<string, unknown> = {
      lesson: new mongoose.Types.ObjectId(id),
    };
    if (!includeInactive) {
      filter.isActive = true;
    }

    const questions = await Question.find(filter).sort({ createdAt: 1 }).lean();

    const data = questions.map((q) =>
      mapQuestionToPayload(
        q as Record<string, unknown>,
        lessonIdStr,
        courseIdStr,
        isStaff,
      ),
    );

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Lesson quiz GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch quiz questions" },
      { status: 500 },
    );
  }
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
        question: string;
        options: string[];
        correctOptionIndex: number;
        explanation?: string;
        isActive?: boolean;
      }>;
    };

    if (!Array.isArray(body.questions)) {
      return NextResponse.json(
        { success: false, error: "questions array is required" },
        { status: 400 },
      );
    }

    const lessonOid = new mongoose.Types.ObjectId(id);
    const createdBy = new mongoose.Types.ObjectId(userId);

    await Question.deleteMany({ lesson: lessonOid });

    if (body.questions.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    for (const q of body.questions) {
      if (!q.question?.trim() || !Array.isArray(q.options) || q.options.length < 2) {
        return NextResponse.json(
          { success: false, error: "Each question needs text and at least two options" },
          { status: 400 },
        );
      }
      if (
        typeof q.correctOptionIndex !== "number" ||
        q.correctOptionIndex < 0 ||
        q.correctOptionIndex >= q.options.length
      ) {
        return NextResponse.json(
          { success: false, error: "Invalid correctOptionIndex" },
          { status: 400 },
        );
      }
    }

    const docs = buildQuestionDocs(body.questions, lessonOid, createdBy);
    const inserted = await Question.insertMany(docs);

    const lessonIdStr = String(lesson._id);
    const courseIdStr = String(lesson.course);

    return NextResponse.json({
      success: true,
      data: inserted.map((doc) =>
        mapQuestionToPayload(
          doc.toObject() as Record<string, unknown>,
          lessonIdStr,
          courseIdStr,
          true,
        ),
      ),
    });
  } catch (error) {
    console.error("Lesson quiz POST replace error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save quiz questions" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import PlatformQuestion from "@/models/PlatformQuestion";
import { isObjectId, requireSessionUser, toObjectId } from "@/app/api/_lib/phase12";
import { isAdminAreaRole } from "@/lib/roles";
import {
  canMutatePlatformQuestion,
  canViewPlatformQuestion,
  serializePlatformQuestion,
} from "@/app/api/_lib/platformQuestions";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, ctx: RouteCtx) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;
    const { id } = await ctx.params;
    if (!isObjectId(id)) {
      return NextResponse.json({ success: false, error: "Invalid question id" }, { status: 400 });
    }

    const { ok, doc, readOnly } = await canViewPlatformQuestion(auth.user, id);
    if (!ok || !doc) {
      return NextResponse.json({ success: false, error: "Question not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: { ...serializePlatformQuestion(doc), readOnly: Boolean(readOnly) },
    });
  } catch (error) {
    console.error("Platform question by id GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch platform question" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, ctx: RouteCtx) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;
    const { id } = await ctx.params;
    if (!isObjectId(id)) {
      return NextResponse.json({ success: false, error: "Invalid question id" }, { status: 400 });
    }

    const { ok } = await canMutatePlatformQuestion(auth.user, id);
    if (!ok) {
      return NextResponse.json({ success: false, error: "Question not found" }, { status: 404 });
    }

    const q = await PlatformQuestion.findById(id);
    if (!q) {
      return NextResponse.json({ success: false, error: "Question not found" }, { status: 404 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const keys = [
      "subject",
      "topic",
      "subtopic",
      "difficulty",
      "questionFormat",
      "questionText",
      "options",
      "answerText",
      "explanation",
      "hasDiagram",
      "diagramUrl",
      "tags",
      "isActive",
      "componentName",
      "componentType",
      // Past-paper fields (recomputed status handled by the model pre-save hook).
      "topicNumber",
      "year",
      "session",
      "paper",
      "questionNumber",
      "msText",
      "marks",
      "calculatorType",
      "diagramStatus",
      "hasMsDiagram",
      "msDiagramStatus",
      "msDiagramUrl",
      "notes",
    ] as const;

    const refFields = [
      "batchId",
      "batchClassId",
      "subjectModuleId",
      "subjectLessonId",
      "courseId",
      "chapterId",
      "lessonId",
      "subjectId",
      "componentId",
    ] as const;

    for (const key of keys) {
      if (key in body) (q as Record<string, unknown>)[key] = body[key];
    }

    for (const key of refFields) {
      if (key in body) {
        const val = body[key];
        if (val && isObjectId(String(val))) {
          (q as Record<string, unknown>)[key] = toObjectId(String(val));
        }
      }
    }

    if (body.componentId) {
      const { enrichPlatformQuestionWithComponent, parseCreatePlatformQuestionBody } =
        await import("@/app/api/_lib/platformQuestions");
      const parsed = parseCreatePlatformQuestionBody(
        {
          ...body,
          subject: body.subject ?? q.subject,
          topic: body.topic ?? q.topic,
          difficulty: body.difficulty ?? q.difficulty,
          questionText: body.questionText ?? q.questionText,
          options: body.options ?? q.options,
        },
        auth.user,
      );
      const enriched = await enrichPlatformQuestionWithComponent(parsed);
      if ("error" in enriched) {
        return NextResponse.json({ success: false, error: enriched.error }, { status: 400 });
      }
      q.subject = enriched.payload.subject;
      q.subjectId = enriched.payload.subjectId as typeof q.subjectId;
      q.subjectCode = enriched.payload.subjectCode;
      q.componentId = enriched.payload.componentId as typeof q.componentId;
      q.componentName = enriched.payload.componentName;
      q.componentType = enriched.payload.componentType;
      q.questionFormat = enriched.payload.questionFormat;
      if (enriched.payload.questionFormat === "written") {
        q.options = [];
      }
    }

    if ("accessPolicy" in body) {
      const policy = String(body.accessPolicy);
      if (["private", "shared_with_instructors", "public"].includes(policy)) {
        if (isAdminAreaRole(auth.user.role)) {
          q.accessPolicy = policy as typeof q.accessPolicy;
        } else if (
          String(q.ownerId) === auth.user.id &&
          (policy === "public" || policy === "private")
        ) {
          q.accessPolicy = policy as typeof q.accessPolicy;
        }
      }
    }

    if ("tagVerified" in body && isAdminAreaRole(auth.user.role)) {
      q.tagVerified = Boolean(body.tagVerified);
    }

    await q.save();
    return NextResponse.json({
      success: true,
      data: serializePlatformQuestion(q.toObject() as Record<string, unknown>),
    });
  } catch (error) {
    console.error("Platform question by id PUT error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update platform question" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, ctx: RouteCtx) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;
    const { id } = await ctx.params;
    if (!isObjectId(id)) {
      return NextResponse.json({ success: false, error: "Invalid question id" }, { status: 400 });
    }

    const { ok } = await canMutatePlatformQuestion(auth.user, id);
    if (!ok) {
      return NextResponse.json({ success: false, error: "Question not found" }, { status: 404 });
    }

    await PlatformQuestion.deleteOne({ _id: id });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Platform question by id DELETE error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete platform question" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ResourceWorksheet from "@/models/ResourceWorksheet";
import { requireSessionUser } from "@/app/api/_lib/phase12";
import {
  applyScopeLabelsToUpdate,
  assertResourceWorksheetStaffAccess,
  findWorksheetConflictForLesson,
  mapResourceWorksheet,
  pickResourceWorksheetUpdate,
} from "@/app/api/_lib/resourceWorksheets";
import {
  RESOURCE_SCOPE_UNSET,
  resolveResourceSubject,
} from "@/app/api/_lib/resourceSubject";
import { resolveNoteWorksheetAccessPolicy } from "@/app/api/_lib/resourceStaffAccess";
import {
  resolveParsedScope,
  resolveScopeLabels,
} from "@/app/api/_lib/resourceScope";
import { isAdminAreaRole } from "@/lib/roles";
import {
  assertStaffCanUsePlatformQuestions,
  assertStaffCanUseQuestions,
  generateWorksheetPdfFromQuestions,
  storeableQuestionObjectIds,
} from "@/app/api/_lib/worksheetGenerate";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const populateScope = [
  { path: "uploadedBy", select: "name email" },
  { path: "batchId", select: "name subject" },
  { path: "chapterId", select: "title subjectLabel" },
  { path: "lessonId", select: "title" },
  { path: "courseId", select: "title" },
  { path: "chapterId", select: "title" },
  { path: "lessonId", select: "title" },
];

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;

    await connectDB();
    const { id } = await params;
    const access = await assertResourceWorksheetStaffAccess(id, auth.user);
    if (access.error) {
      return NextResponse.json(
        { success: false, error: access.error },
        { status: access.status ?? 403 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const update = await pickResourceWorksheetUpdate(body);

    if (isAdminAreaRole(auth.user.role) && (body.subjectId || body.chapter || body.subject) && !body.courseId) {
      const resolved = await resolveResourceSubject(body, { requireChapter: true });
      if (resolved.error || !resolved.value) {
        return NextResponse.json(
          { success: false, error: resolved.error },
          { status: 400 },
        );
      }
      update.scopeType = "subject";
      update.subjectId = resolved.value.subjectId;
      update.subjectCode = resolved.value.subjectCode;
      update.subject = resolved.value.subject;
      update.topic = resolved.value.chapter;
      update.grade = resolved.value.grade;
    } else {
      await applyScopeLabelsToUpdate(body, update);
    }

    const existingCourseId =
      access.row?.courseId != null ? String(access.row.courseId) : undefined;
    const policyResult = await resolveNoteWorksheetAccessPolicy({
      user: auth.user,
      accessPolicyRaw: body.accessPolicy ?? access.row?.accessPolicy,
      courseId:
        typeof body.courseId === "string" ? body.courseId : existingCourseId,
    });
    if (policyResult.error) return policyResult.error;
    update.accessPolicy = policyResult.accessPolicy;

    const nextLessonId =
      update.lessonId != null
        ? String(update.lessonId)
        : access.row?.lessonId != null
          ? String(access.row.lessonId)
          : undefined;
    const conflict = await findWorksheetConflictForLesson(nextLessonId, id);
    if (conflict) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This lesson already has a worksheet. Edit or delete the existing one.",
        },
        { status: 409 },
      );
    }

    const rawIds = Array.isArray(body.questionIds) ? body.questionIds : null;
    const questionIds = rawIds
      ? rawIds
          .filter((qid): qid is string => typeof qid === "string" && qid.trim().length > 0)
          .map((qid) => qid.trim())
      : null;
    const regenerateFromQuestions =
      body.regenerateFromQuestions === true ||
      (questionIds !== null &&
        (access.row?.sourceType === "course_qb" || body.sourceType === "course_qb"));

    if (regenerateFromQuestions) {
      if (!questionIds?.length) {
        return NextResponse.json(
          { success: false, error: "Select at least one question to regenerate the worksheet" },
          { status: 400 },
        );
      }

      const includeAnswers = body.includeAnswers === true;
      const title =
        typeof update.title === "string"
          ? update.title
          : String(access.row?.title || "");
      let topic = typeof update.topic === "string" ? update.topic : String(access.row?.topic || "");
      let questions: Array<Record<string, unknown>> = [];

      const scope = await resolveParsedScope(body);
      if (scope) {
        const labels = await resolveScopeLabels(scope);
        topic = labels.topic;
        const qAccess = await assertStaffCanUseQuestions(
          auth.user.role,
          auth.user.id,
          questionIds,
        );
        if (qAccess.error || !qAccess.questions) {
          return NextResponse.json(
            { success: false, error: qAccess.error || "Invalid questions" },
            { status: 400 },
          );
        }
        questions = qAccess.questions as Array<Record<string, unknown>>;
      } else if (isAdminAreaRole(auth.user.role)) {
        const qAccess = await assertStaffCanUsePlatformQuestions(questionIds);
        if (qAccess.error || !qAccess.questions) {
          return NextResponse.json(
            { success: false, error: qAccess.error || "Invalid questions" },
            { status: 400 },
          );
        }
        questions = qAccess.questions as Array<Record<string, unknown>>;
      } else {
        return NextResponse.json(
          { success: false, error: "Scope is required to regenerate from question bank" },
          { status: 400 },
        );
      }

      const stored = await generateWorksheetPdfFromQuestions({
        title,
        subtitle: topic,
        questions,
        includeAnswers,
      });
      update.pdfUrl = stored.url;
      update.pdfPublicId = stored.publicId;
      update.sourceType = "course_qb";
      update.questionIds = storeableQuestionObjectIds(questionIds);
    } else if (typeof body.pdfUrl === "string" && body.pdfUrl.trim()) {
      update.sourceType = "upload";
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid fields to update" },
        { status: 400 },
      );
    }

    const mongoUpdate: Record<string, unknown> = { $set: update };
    if (isAdminAreaRole(auth.user.role) && update.scopeType === "subject") {
      mongoUpdate.$unset = { ...RESOURCE_SCOPE_UNSET };
    }

    const updated = await ResourceWorksheet.findByIdAndUpdate(id, mongoUpdate, {
      new: true,
      runValidators: true,
    })
      .populate(populateScope)
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        worksheet: mapResourceWorksheet(updated as Record<string, unknown>, {
          canDownload: true,
        }),
      },
    });
  } catch (error) {
    console.error("Update resource worksheet error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;

    await connectDB();
    const { id } = await params;
    const access = await assertResourceWorksheetStaffAccess(id, auth.user);
    if (access.error) {
      return NextResponse.json(
        { success: false, error: access.error },
        { status: access.status ?? 403 },
      );
    }

    await ResourceWorksheet.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete resource worksheet error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ResourceWorksheet from "@/models/ResourceWorksheet";
import { requireSessionUser } from "@/app/api/_lib/phase12";
import {
  findWorksheetConflictForLesson,
  mapResourceWorksheet,
} from "@/app/api/_lib/resourceWorksheets";
import {
  resolveParsedScope,
  resolveScopeLabels,
  scopeFieldsToDoc,
} from "@/app/api/_lib/resourceScope";
import {
  assertStaffCanUsePlatformQuestions,
  assertStaffCanUseQuestions,
  generateWorksheetPdfFromQuestions,
  storeableQuestionObjectIds,
} from "@/app/api/_lib/worksheetGenerate";
import { resolveNoteWorksheetAccessPolicy } from "@/app/api/_lib/resourceStaffAccess";
import { resolveResourceSubject } from "@/app/api/_lib/resourceSubject";
import { isAdminAreaRole } from "@/lib/roles";

const populateScope = [
  { path: "uploadedBy", select: "name email" },
  { path: "batchId", select: "name subject" },
  { path: "chapterId", select: "title subjectLabel" },
  { path: "lessonId", select: "title" },
  { path: "courseId", select: "title" },
  { path: "chapterId", select: "title" },
  { path: "lessonId", select: "title" },
];

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;

    await connectDB();
    const body = (await request.json()) as Record<string, unknown>;

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const rawIds = Array.isArray(body.questionIds) ? body.questionIds : [];
    const questionIds = rawIds
      .filter((id): id is string => typeof id === "string" && id.trim().length > 0)
      .map((id) => id.trim());
    const includeAnswers = body.includeAnswers === true;

    if (!title) {
      return NextResponse.json(
        { success: false, error: "Title is required" },
        { status: 400 },
      );
    }

    let subject = "";
    let topic = "";
    let grade: string | undefined;
    let subjectFields: Record<string, unknown> = {};
    let courseId: string | undefined;
    let questions: Array<Record<string, unknown>> = [];

    const scope = await resolveParsedScope(body);

    if (scope) {
      const labels = await resolveScopeLabels(scope);
      subject = labels.subject;
      topic = labels.topic;
      grade = labels.grade;
      subjectFields = scopeFieldsToDoc(scope);
      courseId = scope.courseId;

      const access = await assertStaffCanUseQuestions(
        auth.user.role,
        auth.user.id,
        questionIds,
      );
      if (access.error || !access.questions) {
        return NextResponse.json(
          { success: false, error: access.error || "Invalid questions" },
          { status: 400 },
        );
      }
      questions = access.questions as Array<Record<string, unknown>>;
    } else if (isAdminAreaRole(auth.user.role)) {
      const resolved = await resolveResourceSubject(body, { requireChapter: true });
      if (resolved.error || !resolved.value) {
        return NextResponse.json(
          { success: false, error: resolved.error },
          { status: 400 },
        );
      }
      subject = resolved.value.subject;
      topic = resolved.value.chapter || "";
      grade = resolved.value.grade;
      subjectFields = {
        scopeType: "subject",
        subjectId: resolved.value.subjectId,
        subjectCode: resolved.value.subjectCode,
      };

      const access = await assertStaffCanUsePlatformQuestions(questionIds);
      if (access.error || !access.questions) {
        return NextResponse.json(
          { success: false, error: access.error || "Invalid questions" },
          { status: 400 },
        );
      }
      questions = access.questions as Array<Record<string, unknown>>;
    } else {
      return NextResponse.json(
        { success: false, error: "Scope (batch or course hierarchy) is required" },
        { status: 400 },
      );
    }

    const conflict = await findWorksheetConflictForLesson(scope?.lessonId);
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

    const stored = await generateWorksheetPdfFromQuestions({
      title,
      subtitle: topic,
      questions,
      includeAnswers,
    });

    const policyResult = await resolveNoteWorksheetAccessPolicy({
      user: auth.user,
      accessPolicyRaw: body.accessPolicy,
      courseId,
    });
    if (policyResult.error) return policyResult.error;
    const accessPolicy = policyResult.accessPolicy;
    const isActive = typeof body.isActive === "boolean" ? body.isActive : true;

    const row = await ResourceWorksheet.create({
      title,
      subject,
      topic,
      grade,
      pdfUrl: stored.url,
      pdfPublicId: stored.publicId,
      sourceType: "course_qb",
      questionIds: storeableQuestionObjectIds(questionIds),
      description:
        typeof body.description === "string"
          ? body.description.trim() || undefined
          : undefined,
      isActive,
      accessPolicy,
      uploadedBy: auth.user.id,
      ...subjectFields,
    });

    const created = await ResourceWorksheet.findById(row._id).populate(populateScope).lean();

    return NextResponse.json(
      {
        success: true,
        data: {
          worksheet: mapResourceWorksheet(created as Record<string, unknown>, {
            canDownload: true,
          }),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Generate resource worksheet error:", error);
    const detail =
      error instanceof Error && error.message
        ? error.message
        : "Failed to generate worksheet PDF";
    return NextResponse.json(
      {
        success: false,
        error:
          process.env.NODE_ENV === "production"
            ? "Failed to generate worksheet PDF"
            : `Failed to generate worksheet PDF: ${detail}`,
      },
      { status: 500 },
    );
  }
}

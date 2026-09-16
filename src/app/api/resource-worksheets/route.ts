import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ResourceWorksheet from "@/models/ResourceWorksheet";
import {
  requireSessionUser,
  isObjectId,
  toObjectId,
  escapeRegex,
} from "@/app/api/_lib/phase12";
import {
  resolveParsedScope,
  resolveScopeLabels,
  scopeFieldsToDoc,
} from "@/app/api/_lib/resourceScope";
import { resolveNoteWorksheetAccessPolicy } from "@/app/api/_lib/resourceStaffAccess";
import {
  applyResourceWorksheetStaffScope,
  findWorksheetConflictForLesson,
  mapResourceWorksheet,
  trimOptionalUrl,
} from "@/app/api/_lib/resourceWorksheets";
import { resolveResourceSubject } from "@/app/api/_lib/resourceSubject";
import { resolveGradeQueryValue } from "@/lib/batchGrades";
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

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;

    await connectDB();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();
    const courseId = searchParams.get("courseId")?.trim();
    const subject = searchParams.get("subject")?.trim();
    const topic = searchParams.get("topic")?.trim();
    const grade = searchParams.get("grade")?.trim();
    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      50,
      Math.max(1, Number.parseInt(searchParams.get("limit") || "20", 10)),
    );
    const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;

    const query: Record<string, unknown> = { isActive: true };
    if (search) {
      query.$or = [
        { title: { $regex: escapeRegex(search), $options: "i" } },
        { subject: { $regex: escapeRegex(search), $options: "i" } },
        { topic: { $regex: escapeRegex(search), $options: "i" } },
      ];
    }
    if (courseId && isObjectId(courseId)) {
      query.courseId = toObjectId(courseId);
    }
    if (subject) query.subject = { $regex: escapeRegex(subject), $options: "i" };
    if (topic) query.topic = { $regex: escapeRegex(topic), $options: "i" };
    const gradeMatch = resolveGradeQueryValue(grade);
    if (gradeMatch) query.grade = gradeMatch;

    await applyResourceWorksheetStaffScope(query, auth.user.role, auth.user.id);

    const subjectQuery: Record<string, unknown> = { isActive: true };
    if (gradeMatch) subjectQuery.grade = gradeMatch;
    if (courseId && isObjectId(courseId)) {
      subjectQuery.courseId = toObjectId(courseId);
    }
    await applyResourceWorksheetStaffScope(
      subjectQuery,
      auth.user.role,
      auth.user.id,
    );

    const topicQuery: Record<string, unknown> = { ...subjectQuery };
    if (subject) {
      topicQuery.subject = { $regex: escapeRegex(subject), $options: "i" };
    }

    const skip = (page - 1) * limit;
    const [rows, total, subjects, topics] = await Promise.all([
      ResourceWorksheet.find(query)
        .populate(populateScope)
        .sort({ createdAt: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
      ResourceWorksheet.countDocuments(query),
      ResourceWorksheet.distinct("subject", subjectQuery),
      ResourceWorksheet.distinct("topic", topicQuery),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        worksheets: rows.map((row) =>
          mapResourceWorksheet(row as Record<string, unknown>, { canDownload: true }),
        ),
        subjects: subjects
          .map((value) => String(value ?? "").trim())
          .filter(Boolean)
          .sort(),
        topics: topics
          .map((value) => String(value ?? "").trim())
          .filter(Boolean)
          .sort(),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit) || 1,
        },
      },
    });
  } catch (error) {
    console.error("List resource worksheets error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;

    await connectDB();
    const body = (await request.json()) as Record<string, unknown>;

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const pdfUrl = trimOptionalUrl(body.pdfUrl);
    const scope = await resolveParsedScope(body);

    let subject = "";
    let topic = "";
    let grade: string | undefined;
    let subjectFields: Record<string, unknown> = {};

    if (scope) {
      const labels = await resolveScopeLabels(scope);
      subject = labels.subject;
      topic = labels.topic;
      grade = labels.grade;
      subjectFields = scopeFieldsToDoc(scope);
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
    } else {
      return NextResponse.json(
        { success: false, error: "Scope (batch or course hierarchy) is required" },
        { status: 400 },
      );
    }

    if (!title || !pdfUrl) {
      return NextResponse.json(
        { success: false, error: "Title and PDF are required" },
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

    const policyResult = await resolveNoteWorksheetAccessPolicy({
      user: auth.user,
      accessPolicyRaw: body.accessPolicy,
      courseId: scope?.courseId,
    });
    if (policyResult.error) return policyResult.error;
    const accessPolicy = policyResult.accessPolicy;
    const isActive = typeof body.isActive === "boolean" ? body.isActive : true;

    const row = await ResourceWorksheet.create({
      title,
      subject,
      topic,
      grade,
      pdfUrl,
      pdfPublicId: trimOptionalUrl(body.pdfPublicId),
      marksPdfUrl: trimOptionalUrl(body.marksPdfUrl),
      marksPdfPublicId: trimOptionalUrl(body.marksPdfPublicId),
      description:
        typeof body.description === "string"
          ? body.description.trim() || undefined
          : undefined,
      isActive,
      accessPolicy,
      uploadedBy: auth.user.id,
      sourceType: "upload",
      ...subjectFields,
    });

    const created = await ResourceWorksheet.findById(row._id)
      .populate(populateScope)
      .lean();

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
    console.error("Create resource worksheet error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

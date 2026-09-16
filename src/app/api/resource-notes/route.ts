import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ResourceNote from "@/models/ResourceNote";
import Subject from "@/models/Subject";
import {
  applyResourceNoteStaffScope,
  mapResourceNote,
  trimOptionalUrl,
} from "@/app/api/_lib/resourceNotes";
import {
  resolveParsedScope,
  resolveScopeLabels,
  scopeFieldsToDoc,
} from "@/app/api/_lib/resourceScope";
import { resolveNoteWorksheetAccessPolicy } from "@/app/api/_lib/resourceStaffAccess";
import { resolveResourceSubject } from "@/app/api/_lib/resourceSubject";
import {
  requireSessionUser,
  escapeRegex,
  toObjectId,
} from "@/app/api/_lib/phase12";
import { resolveGradeQueryValue } from "@/lib/batchGrades";
import { isAdminAreaRole } from "@/lib/roles";
import {
  normalizeSubjectChapters,
  sortRowsByChapterTopic,
  sortTopicNamesByChapters,
} from "@/lib/subjectChapters";

async function loadSubjectChapters(subjectName: string | undefined, gradeMatch: unknown) {
  if (!subjectName) return [];
  const nameFilter = {
    name: { $regex: `^${escapeRegex(subjectName)}$`, $options: "i" },
    isActive: { $ne: false },
  };
  let doc = gradeMatch
    ? await Subject.findOne({ ...nameFilter, grade: gradeMatch }).select("chapters").lean()
    : null;
  if (!doc) {
    doc = await Subject.findOne(nameFilter).select("chapters").lean();
  }
  return normalizeSubjectChapters(doc?.chapters);
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;

    await connectDB();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();
    const subject = searchParams.get("subject")?.trim();
    const topic = searchParams.get("topic")?.trim();
    const grade = searchParams.get("grade")?.trim();
    const isActive = searchParams.get("isActive");
    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(
      50,
      Math.max(1, Number.parseInt(searchParams.get("limit") || "20", 10)),
    );
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;

    const query: Record<string, unknown> = {};

    if (search) {
      query.$or = [
        { title: { $regex: escapeRegex(search), $options: "i" } },
        { subject: { $regex: escapeRegex(search), $options: "i" } },
        { topic: { $regex: escapeRegex(search), $options: "i" } },
        { description: { $regex: escapeRegex(search), $options: "i" } },
      ];
    }
    if (subject) query.subject = { $regex: escapeRegex(subject), $options: "i" };
    if (topic) query.topic = { $regex: escapeRegex(topic), $options: "i" };
    const gradeMatch = resolveGradeQueryValue(grade);
    if (gradeMatch) query.grade = gradeMatch;
    if (isActive != null) query.isActive = isActive === "true";
    else query.isActive = true;

    const courseId = searchParams.get("courseId")?.trim();
    if (courseId) query.courseId = toObjectId(courseId);

    await applyResourceNoteStaffScope(query, auth.user.role, auth.user.id);

    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder };
    const skip = (page - 1) * limit;

    const subjectQuery: Record<string, unknown> = {
      ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
    };
    if (gradeMatch) subjectQuery.grade = gradeMatch;
    if (courseId) subjectQuery.courseId = toObjectId(courseId);
    await applyResourceNoteStaffScope(
      subjectQuery,
      auth.user.role,
      auth.user.id,
    );

    const topicQuery: Record<string, unknown> = { ...subjectQuery };
    if (subject) {
      topicQuery.subject = { $regex: escapeRegex(subject), $options: "i" };
    }

    const chapters = await loadSubjectChapters(subject, gradeMatch);
    const useChapterOrder = Boolean(subject && chapters.length);

    const [rows, total, subjects, topics] = await Promise.all([
      ResourceNote.find(query)
        .populate("uploadedBy", "name email")
        .populate("batchId", "name subject")
        .populate("chapterId", "title subjectLabel")
        .populate("lessonId", "title")
        .populate("courseId", "title")
        .populate("chapterId", "title")
        .populate("lessonId", "title")
        .sort(useChapterOrder ? { createdAt: -1 } : sort)
        .lean(),
      ResourceNote.countDocuments(query),
      ResourceNote.distinct("subject", subjectQuery),
      ResourceNote.distinct("topic", topicQuery),
    ]);

    const orderedRows = useChapterOrder
      ? sortRowsByChapterTopic(
          rows as Array<{ topic?: string }>,
          (row) => row.topic,
          chapters,
        )
      : rows;

    const pageRows = orderedRows.slice(skip, skip + limit);

    return NextResponse.json({
      success: true,
      data: {
        notes: pageRows.map((row) =>
          mapResourceNote(row as Record<string, unknown>, { canDownload: true }),
        ),
        subjects: subjects
          .map((value) => String(value ?? "").trim())
          .filter(Boolean)
          .sort(),
        topics: sortTopicNamesByChapters(
          topics.map((value) => String(value ?? "").trim()).filter(Boolean),
          chapters,
        ),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit) || 1,
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("List resource notes error:", error);
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

    let subject = typeof body.subject === "string" ? body.subject.trim() : "";
    let topic = typeof body.topic === "string" ? body.topic.trim() : "";
    let grade: string | undefined;
    let subjectFields: Record<string, unknown> = {};

    if (scope) {
      const labels = await resolveScopeLabels(scope);
      subject =
        typeof body.subject === "string" && body.subject.trim()
          ? body.subject.trim()
          : labels.subject;
      topic = labels.topic;
      grade =
        typeof body.grade === "string" && body.grade.trim()
          ? body.grade.trim().toUpperCase()
          : labels.grade;
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
        {
          success: false,
          error: "Scope (batch or course hierarchy) is required",
        },
        { status: 400 },
      );
    }

    if (!title || !subject || !topic || !pdfUrl) {
      return NextResponse.json(
        { success: false, error: "Title and PDF are required" },
        { status: 400 },
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

    const note = await ResourceNote.create({
      title,
      subject,
      topic,
      grade,
      pdfUrl,
      pdfPublicId: trimOptionalUrl(body.pdfPublicId),
      description:
        typeof body.description === "string"
          ? body.description.trim() || undefined
          : undefined,
      isActive,
      accessPolicy,
      uploadedBy: auth.user.id,
      ...subjectFields,
    });

    const created = await ResourceNote.findById(note._id)
      .populate("uploadedBy", "name email")
      .populate("batchId", "name subject")
      .populate("chapterId", "title subjectLabel")
      .populate("lessonId", "title")
      .populate("courseId", "title")
      .populate("chapterId", "title")
      .populate("lessonId", "title")
      .lean();

    return NextResponse.json(
      {
        success: true,
        data: {
          note: mapResourceNote(created as Record<string, unknown>, {
            canDownload: true,
          }),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create resource note error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

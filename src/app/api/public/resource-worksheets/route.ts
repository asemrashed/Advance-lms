import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import connectDB from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import ResourceWorksheet from "@/models/ResourceWorksheet";
import Subject from "@/models/Subject";
import {
  buildResourceWorksheetBrowseFilter,
  mapResourceWorksheet,
  resolveWorksheetBrowseCanDownload,
} from "@/app/api/_lib/resourceWorksheets";
import {
  resolveResourceCenterAccess,
  summarizeResourceBrowseAccess,
} from "@/app/api/_lib/resourceAccess";
import { escapeRegex } from "@/app/api/_lib/phase12";
import { resolveGradeQueryValue } from "@/lib/batchGrades";
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
    await connectDB();
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const role = session?.user?.role;
    const access = await resolveResourceCenterAccess(userId, role);

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();
    const subject = searchParams.get("subject")?.trim();
    const topic = searchParams.get("topic")?.trim();
    const grade = searchParams.get("grade")?.trim();
    const gradeMatch = resolveGradeQueryValue(grade);

    const visibility = await buildResourceWorksheetBrowseFilter({
      userId,
      role,
    });

    const query: Record<string, unknown> = { ...visibility };
    if (search) {
      query.$or = [
        { title: { $regex: escapeRegex(search), $options: "i" } },
        { subject: { $regex: escapeRegex(search), $options: "i" } },
        { topic: { $regex: escapeRegex(search), $options: "i" } },
      ];
    }
    if (subject) query.subject = { $regex: escapeRegex(subject), $options: "i" };
    if (topic) query.topic = { $regex: escapeRegex(topic), $options: "i" };
    if (gradeMatch) query.grade = gradeMatch;

    const rows = await ResourceWorksheet.find(query)
      .sort({ subject: 1, topic: 1, createdAt: -1 })
      .lean();

    const subjectQuery: Record<string, unknown> = { ...visibility };
    if (gradeMatch) subjectQuery.grade = gradeMatch;

    const subjectRows = await ResourceWorksheet.find(subjectQuery)
      .select("subject")
      .lean();

    const topicQuery: Record<string, unknown> = { ...visibility };
    if (gradeMatch) topicQuery.grade = gradeMatch;
    if (subject) topicQuery.subject = { $regex: escapeRegex(subject), $options: "i" };

    const topicRows = await ResourceWorksheet.find(topicQuery)
      .select("topic")
      .lean();

    const chapters = await loadSubjectChapters(subject, gradeMatch);
    const orderedRows = sortRowsByChapterTopic(
      rows as Array<{ topic?: string }>,
      (row) => row.topic,
      chapters,
    );

    const worksheets = await Promise.all(
      orderedRows.map(async (row) => {
        const canDownload = await resolveWorksheetBrowseCanDownload(
          userId,
          role,
          row as { accessPolicy?: string; subject?: string; batchId?: unknown },
        );
        return mapResourceWorksheet(row as Record<string, unknown>, {
          includePdf: false,
          canDownload,
        });
      }),
    );

    const topicNames = [
      ...new Set(
        topicRows
          .map((r) => String(r.topic ?? "").trim())
          .filter(Boolean),
      ),
    ];

    return NextResponse.json({
      success: true,
      data: {
        worksheets,
        subjects: [
          ...new Set(
            subjectRows
              .map((r) => String(r.subject ?? "").trim())
              .filter(Boolean),
          ),
        ].sort(),
        topics: sortTopicNamesByChapters(topicNames, chapters),
        access,
        stats: summarizeResourceBrowseAccess(worksheets),
      },
    });
  } catch (error) {
    console.error("Public resource worksheets error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

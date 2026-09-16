import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import connectDB from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import ResourceNote from "@/models/ResourceNote";
import Subject from "@/models/Subject";
import {
  mapResourceNote,
  resolveBrowseCanDownload,
  VISIBLE_RESOURCE_NOTE_FILTER,
} from "@/app/api/_lib/resourceNotes";
import {
  publicResourceCenterScopeFilter,
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

    const publicScope = publicResourceCenterScopeFilter();
    const query: Record<string, unknown> = {
      ...VISIBLE_RESOURCE_NOTE_FILTER,
      ...publicScope,
    };

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
    if (gradeMatch) query.grade = gradeMatch;

    const rows = await ResourceNote.find(query)
      .sort({ subject: 1, topic: 1, createdAt: -1 })
      .lean();

    // Subjects for the selected class (independent of subject/topic filters)
    const subjectQuery: Record<string, unknown> = {
      ...VISIBLE_RESOURCE_NOTE_FILTER,
      ...publicScope,
    };
    if (gradeMatch) subjectQuery.grade = gradeMatch;

    const subjectRows = await ResourceNote.find(subjectQuery)
      .select("subject")
      .lean();

    // Topics (chapters) for selected class + subject
    const topicQuery: Record<string, unknown> = {
      ...VISIBLE_RESOURCE_NOTE_FILTER,
      ...publicScope,
    };
    if (gradeMatch) topicQuery.grade = gradeMatch;
    if (subject) topicQuery.subject = { $regex: escapeRegex(subject), $options: "i" };

    const topicRows = await ResourceNote.find(topicQuery)
      .select("topic")
      .lean();

    const chapters = await loadSubjectChapters(subject, gradeMatch);

    const orderedRows = sortRowsByChapterTopic(
      rows as Array<{ topic?: string }>,
      (row) => row.topic,
      chapters,
    );

    const notes = await Promise.all(
      orderedRows.map(async (row) => {
        const canDownload = await resolveBrowseCanDownload(
          userId,
          role,
          row as { accessPolicy?: string; subject?: string; batchId?: unknown },
        );
        return mapResourceNote(row as Record<string, unknown>, {
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
        notes,
        subjects: [
          ...new Set(
            subjectRows
              .map((r) => String(r.subject ?? "").trim())
              .filter(Boolean),
          ),
        ].sort(),
        topics: sortTopicNamesByChapters(topicNames, chapters),
        access,
        stats: summarizeResourceBrowseAccess(notes),
      },
    });
  } catch (error) {
    console.error("Public resource notes error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

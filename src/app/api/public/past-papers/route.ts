import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Course from "@/models/Course";
import PastPaper from "@/models/PastPaper";
import {
  buildPastPaperFilterQuery,
  buildPastPaperSort,
  VISIBLE_PAST_PAPER_FILTER,
} from "@/app/api/_lib/pastPapers";
import { parseLimit, parsePage, escapeRegex } from "@/app/api/_lib/phase12";
import { resolveGradeQueryValue } from "@/lib/batchGrades";

function mapPublicPastPaper(row: Record<string, unknown>) {
  const course = row.course;
  let courseData: { _id: string; title?: string; grade?: string } | string =
    "";
  if (course && typeof course === "object" && "_id" in (course as object)) {
    const c = course as { _id: unknown; title?: string; grade?: string };
    courseData = {
      _id: String(c._id),
      title: c.title,
      grade: c.grade,
    };
  } else if (course) {
    courseData = String(course);
  }

  return {
    _id: String(row._id),
    course: courseData,
    sessionName: row.sessionName as string,
    year: row.year as number,
    subject: row.subject as string,
    grade: (row.grade as string) || undefined,
    examType: row.examType as string,
    description: (row.description as string) || undefined,
    hasQuestionPaper: Boolean(
      typeof row.questionPaperUrl === "string" && row.questionPaperUrl.trim(),
    ),
    hasMarksPdf: Boolean(
      typeof row.marksPdfUrl === "string" && row.marksPdfUrl.trim(),
    ),
    hasWorkSolution: Boolean(
      typeof row.workSolutionUrl === "string" && row.workSolutionUrl.trim(),
    ),
    createdAt: row.createdAt,
  };
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parsePage(searchParams);
    const limit = parseLimit(searchParams, 20, 100);
    const grade = searchParams.get("grade")?.trim();
    const subject = searchParams.get("subject")?.trim();
    const gradeMatch = resolveGradeQueryValue(grade);

    const query: Record<string, unknown> = {
      ...VISIBLE_PAST_PAPER_FILTER,
      ...buildPastPaperFilterQuery(searchParams, { includeYearRange: true }),
    };
    const notCourseScoped = {
      $or: [{ course: { $exists: false } }, { course: null }],
    };
    if (query.$or) {
      query.$and = [{ $or: query.$or as unknown[] }, notCourseScoped];
      delete query.$or;
    } else {
      query.$or = notCourseScoped.$or;
    }
    const sort = buildPastPaperSort(searchParams);
    const skip = (page - 1) * limit;

    // Subjects for selected class only
    const subjectScope: Record<string, unknown> = {
      ...VISIBLE_PAST_PAPER_FILTER,
      ...notCourseScoped,
    };
    if (gradeMatch) subjectScope.grade = gradeMatch;

    // Year / session / variant options scoped to class + subject
    const optionScope: Record<string, unknown> = {
      ...VISIBLE_PAST_PAPER_FILTER,
      ...notCourseScoped,
    };
    if (gradeMatch) optionScope.grade = gradeMatch;
    if (subject) {
      optionScope.subject = { $regex: escapeRegex(subject), $options: "i" };
    }

    const [
      rows,
      total,
      subjects,
      examTypes,
      years,
      sessionNames,
      courseIds,
    ] = await Promise.all([
      PastPaper.find(query)
        .populate("course", "title grade")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      PastPaper.countDocuments(query),
      PastPaper.distinct("subject", subjectScope),
      PastPaper.distinct("examType", optionScope),
      PastPaper.distinct("year", optionScope),
      PastPaper.distinct("sessionName", optionScope),
      PastPaper.distinct("course", optionScope),
    ]);

    years.sort((a: number, b: number) => b - a);
    sessionNames.sort();

    const courses = await Course.find({ _id: { $in: courseIds } })
      .select("title grade")
      .sort({ title: 1 })
      .lean();

    const pastPapers = rows.map((row) =>
      mapPublicPastPaper(row as Record<string, unknown>),
    );

    return NextResponse.json({
      success: true,
      data: {
        pastPapers,
        filters: {
          subjects: subjects.sort(),
          examTypes: examTypes.sort(),
          years,
          sessionNames,
          courses: courses.map((c) => ({
            _id: String(c._id),
            title: c.title,
            grade: c.grade,
          })),
        },
        pagination: {
          page,
          limit,
          total,
          pages: limit > 0 ? Math.ceil(total / limit) : 0,
        },
      },
    });
  } catch (error) {
    console.error("Public past papers error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

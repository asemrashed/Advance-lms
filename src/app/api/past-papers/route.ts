import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import connectDB from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import PastPaper from "@/models/PastPaper";
import {
  requireSessionUser,
  escapeRegex,
} from "@/app/api/_lib/phase12";
import { isPastPaperSession } from "@/lib/pastPaperSessions";
import type { AppRole } from "@/app/api/_lib/phase12";
import {
  applyPastPaperListScope,
  parsePastPaperYear,
  trimOptionalUrl,
} from "@/app/api/_lib/pastPapers";
import { resolveResourceSubject } from "@/app/api/_lib/resourceSubject";
import { resolveGradeQueryValue } from "@/lib/batchGrades";

type PastPaperQuery = Record<string, unknown>;

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const session = await getServerSession(authOptions);
    const role = session?.user?.role;
    const userId = session?.user?.id;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const sessionName = searchParams.get("sessionName");
    const year = searchParams.get("year");
    const subject = searchParams.get("subject");
    const grade = searchParams.get("grade");
    const examType = searchParams.get("examType");
    const paperType = searchParams.get("paperType");
    const isActive = searchParams.get("isActive");
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const query: PastPaperQuery = {};

    if (search) {
      query.$or = [
        { sessionName: { $regex: escapeRegex(search), $options: "i" } },
        { subject: { $regex: escapeRegex(search), $options: "i" } },
        { examType: { $regex: escapeRegex(search), $options: "i" } },
        { description: { $regex: escapeRegex(search), $options: "i" } },
        { tags: { $regex: escapeRegex(search), $options: "i" } },
      ];
    }

    if (sessionName) {
      query.sessionName = { $regex: escapeRegex(sessionName), $options: "i" };
    }

    if (year) {
      query.year = Number.parseInt(year, 10);
    }

    if (subject) {
      query.subject = { $regex: escapeRegex(subject), $options: "i" };
    }

    if (grade && grade !== "all") {
      const gradeMatch = resolveGradeQueryValue(grade);
      if (gradeMatch) query.grade = gradeMatch;
    }

    if (examType) {
      query.examType = { $regex: escapeRegex(examType), $options: "i" };
    }

    if (paperType) {
      switch (paperType) {
        case "question_paper":
          query.questionPaperUrl = { $exists: true, $ne: "" };
          break;
        case "marks_pdf":
          query.marksPdfUrl = { $exists: true, $ne: "" };
          break;
        case "work_solution":
          query.workSolutionUrl = { $exists: true, $ne: "" };
          break;
      }
    }

    if (role !== "student" && isActive != null) {
      query.isActive = isActive === "true";
    }

    await applyPastPaperListScope(query, role as AppRole | undefined, userId);

    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    const pastPapers = await PastPaper.find(query)
      .populate("course", "title")
      .sort(sort)
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        pastPapers,
      },
    });
  } catch (error) {
    console.error("Get past papers error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSessionUser(["admin"]);
    if (auth.error) return auth.error;

    const body = (await request.json()) as Record<string, unknown>;
    const sessionName =
      typeof body.sessionName === "string" ? body.sessionName.trim() : "";
    const examType =
      typeof body.examType === "string" ? body.examType.trim() : "";
    const year = parsePastPaperYear(body.year);

    if (!sessionName || !examType || year === null) {
      return NextResponse.json(
        {
          error:
            "Session, year, subject, and exam variant are required and must be valid",
        },
        { status: 400 },
      );
    }

    if (!isPastPaperSession(sessionName)) {
      return NextResponse.json(
        { error: "Session must be March, June, or November" },
        { status: 400 },
      );
    }

    await connectDB();
    const resolved = await resolveResourceSubject(body, { requireChapter: false });
    if (resolved.error || !resolved.value) {
      return NextResponse.json({ error: resolved.error || "Subject is required" }, { status: 400 });
    }

    const existingPaper = await PastPaper.findOne({
      subject: resolved.value.subject,
      sessionName,
      year,
      examType,
      grade: resolved.value.grade || null,
    });

    if (existingPaper) {
      return NextResponse.json(
        {
          error:
            "A past paper with this session, year, subject, grade, and exam variant already exists",
        },
        { status: 409 },
      );
    }

    const isActive = typeof body.isActive === "boolean" ? body.isActive : true;

    const pastPaper = await PastPaper.create({
      subjectId: resolved.value.subjectId,
      subjectCode: resolved.value.subjectCode,
      sessionName,
      year,
      subject: resolved.value.subject,
      grade: resolved.value.grade,
      examType,
      questionPaperUrl: trimOptionalUrl(body.questionPaperUrl),
      marksPdfUrl: trimOptionalUrl(body.marksPdfUrl),
      workSolutionUrl: trimOptionalUrl(body.workSolutionUrl),
      description:
        typeof body.description === "string"
          ? body.description.trim() || undefined
          : undefined,
      tags:
        typeof body.tags === "string" ? body.tags.trim() || undefined : undefined,
      isActive,
      uploadedBy: auth.user.id,
    });

    const created = await PastPaper.findById(pastPaper._id)
      .populate("course", "title")
      .lean();

    return NextResponse.json({ pastPaper: created }, { status: 201 });
  } catch (error) {
    console.error("Create past paper error:", error);
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: number }).code === 11000
    ) {
      return NextResponse.json(
        {
          error:
            "A past paper with this session, year, subject, and exam variant already exists",
        },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

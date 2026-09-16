import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import connectDB from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import Subject from "@/models/Subject";
import {
  countCoursesForSubject,
  countQuestionsForSubject,
  mapSubject,
  toSubjectComponentDocs,
  validateSubjectPayload,
} from "@/app/api/_lib/subjects";
import { escapeRegex } from "@/app/api/_lib/phase12";
import { resolveGradeQueryValue } from "@/lib/batchGrades";
import { requireAdminPermission } from "@/app/api/_lib/adminPermissions";
import { isAdminAreaRole } from "@/lib/roles";

type SafeSortField = "name" | "code" | "createdAt" | "updatedAt";
const ALLOWED_SORT: SafeSortField[] = ["name", "code", "createdAt", "updatedAt"];

function toPositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function requireCreateSubject() {
  const auth = await requireAdminPermission("create_subjects");
  return auth.error;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;
    const isStaff = isAdminAreaRole(role) || role === "instructor" || role === "student";
    if (!session?.user?.id || !isStaff) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }

    await connectDB();
    const { searchParams } = new URL(request.url);
    const page = toPositiveInt(searchParams.get("page"), 1);
    const limit = Math.min(toPositiveInt(searchParams.get("limit"), 100), 500);
    const search = String(searchParams.get("search") || "").trim();
    const isActiveRaw = searchParams.get("isActive");
    const grade = String(searchParams.get("grade") || "").trim();
    const sortByRaw = String(searchParams.get("sortBy") || "name").trim();
    const sortOrderRaw = String(searchParams.get("sortOrder") || "asc").trim();
    const includeCounts = searchParams.get("includeCounts") === "true";
    const sortBy: SafeSortField = ALLOWED_SORT.includes(sortByRaw as SafeSortField)
      ? (sortByRaw as SafeSortField)
      : "name";
    const sortOrder: 1 | -1 = sortOrderRaw === "desc" ? -1 : 1;

    const filter: Record<string, unknown> = {};
    if (search) {
      filter.$or = [
        { name: { $regex: escapeRegex(search), $options: "i" } },
        { code: { $regex: escapeRegex(search), $options: "i" } },
        { slug: { $regex: escapeRegex(search), $options: "i" } },
      ];
    }
    if (isActiveRaw === "true") filter.isActive = true;
    else if (isActiveRaw === "false") filter.isActive = false;
    else if (!isAdminAreaRole(role)) filter.isActive = true;
    const gradeMatch = resolveGradeQueryValue(grade);
    if (gradeMatch) filter.grade = gradeMatch;

    const skip = (page - 1) * limit;
    const [rows, total, activeCount] = await Promise.all([
      Subject.find(filter).sort({ [sortBy]: sortOrder }).skip(skip).limit(limit).lean(),
      Subject.countDocuments(filter),
      Subject.countDocuments({ ...filter, isActive: true }),
    ]);

    const subjects = await Promise.all(
      rows.map(async (row) => {
        const counts =
          includeCounts && isAdminAreaRole(role)
            ? {
                courseCount: await countCoursesForSubject(row),
                questionCount: await countQuestionsForSubject(row),
              }
            : undefined;
        return mapSubject(row as Record<string, unknown>, counts);
      }),
    );

    const pages = total > 0 ? Math.ceil(total / limit) : 0;
    const withCourses =
      includeCounts && isAdminAreaRole(role)
        ? subjects.filter((s) => (s.courseCount ?? 0) > 0).length
        : 0;

    return NextResponse.json({
      success: true,
      data: {
        subjects,
        pagination: { page, limit, total, pages, hasNext: page < pages, hasPrev: page > 1 && pages > 0 },
        stats:
          includeCounts && isAdminAreaRole(role)
            ? {
                totalSubjects: total,
                activeSubjects: activeCount,
                inactiveSubjects: Math.max(total - activeCount, 0),
                subjectsWithCourses: withCourses,
              }
            : undefined,
      },
    });
  } catch (error) {
    console.error("Subject list error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch subjects" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authError = await requireCreateSubject();
    if (authError) return authError;

    await connectDB();
    const body = (await request.json()) as Record<string, unknown>;
    const validated = validateSubjectPayload(body);
    if ("error" in validated) {
      return NextResponse.json({ success: false, error: validated.error }, { status: 400 });
    }

    const isActive = typeof body.isActive === "boolean" ? body.isActive : true;
    const qbAccessPriceRaw = body.qbAccessPrice;
    const qbAccessPrice =
      qbAccessPriceRaw != null && Number.isFinite(Number(qbAccessPriceRaw))
        ? Math.max(0, Number(qbAccessPriceRaw))
        : undefined;
    const chapters = validated.chapters ?? [];
    if (!chapters.length) {
      return NextResponse.json(
        { success: false, error: "Add at least one chapter for this subject" },
        { status: 400 },
      );
    }
    const components = validated.components ?? [];
    if (!components.length) {
      return NextResponse.json(
        {
          success: false,
          error: "Add at least one exam component (MCQ or Written)",
        },
        { status: 400 },
      );
    }
    const existing = await Subject.findOne({
      $or: [
        { code: validated.code },
        { slug: validated.slug },
        {
          name: {
            $regex: `^${escapeRegex(validated.name)}$`,
            $options: "i",
          },
        },
      ],
    })
      .select("_id")
      .lean();
    if (existing) {
      return NextResponse.json(
        { success: false, error: "A subject with this name or code already exists" },
        { status: 409 },
      );
    }

    const created = await Subject.create({
      name: validated.name,
      code: validated.code,
      slug: validated.slug,
      grade: validated.grade,
      chapters,
      components: toSubjectComponentDocs(components),
      isActive,
      qbAccessPrice,
    });

    return NextResponse.json({
      success: true,
      data: mapSubject(created.toObject() as Record<string, unknown>),
    });
  } catch (error) {
    if (error instanceof mongoose.Error && error.name === "ValidationError") {
      return NextResponse.json(
        { success: false, error: "Invalid subject payload" },
        { status: 400 },
      );
    }
    console.error("Subject create error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create subject" },
      { status: 500 },
    );
  }
}

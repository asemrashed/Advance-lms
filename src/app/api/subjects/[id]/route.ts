import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Subject from "@/models/Subject";
import {
  countCoursesForSubject,
  countQuestionsForSubject,
  mapSubject,
  toSubjectComponentDocs,
  validateSubjectPayload,
} from "@/app/api/_lib/subjects";
import { normalizeSubjectCode } from "@/lib/subjectUtils";
import { escapeRegex } from "@/app/api/_lib/phase12";
import { requireAdminPermission } from "@/app/api/_lib/adminPermissions";

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function requireCreateSubject() {
  const auth = await requireAdminPermission("create_subjects");
  return auth.error;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const authError = await requireCreateSubject();
    if (authError) return authError;

    await connectDB();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid subject ID" }, { status: 400 });
    }

    const existing = await Subject.findById(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: "Subject not found" }, { status: 404 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const name = body.name != null ? String(body.name).trim() : existing.name;
    const code =
      body.code != null ? normalizeSubjectCode(body.code) : String(existing.code);
    const validated = validateSubjectPayload({
      name,
      code,
      ...(body.chapters !== undefined ? { chapters: body.chapters } : {}),
      ...(body.components !== undefined ? { components: body.components } : {}),
    });
    if ("error" in validated) {
      return NextResponse.json({ success: false, error: validated.error }, { status: 400 });
    }

    const duplicate = await Subject.findOne({
      _id: { $ne: id },
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
    if (duplicate) {
      return NextResponse.json(
        { success: false, error: "Another subject already uses this name or code" },
        { status: 409 },
      );
    }

    existing.name = validated.name;
    existing.code = validated.code;
    existing.slug = validated.slug;
    if (body.grade !== undefined) {
      const nextGrade = String(body.grade || "").trim().toUpperCase();
      existing.grade = nextGrade || undefined;
    }
    if (body.chapters !== undefined) {
      const chapters = validated.chapters ?? [];
      if (!chapters.length) {
        return NextResponse.json(
          { success: false, error: "Add at least one chapter for this subject" },
          { status: 400 },
        );
      }
      existing.chapters = chapters;
    }
    if (body.components !== undefined) {
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
      existing.components = toSubjectComponentDocs(components) as typeof existing.components;
    }
    if (body.qbAccessPrice !== undefined) {
      if (body.qbAccessPrice === null || body.qbAccessPrice === "") {
        existing.qbAccessPrice = undefined;
      } else {
        const price = Number(body.qbAccessPrice);
        existing.qbAccessPrice =
          Number.isFinite(price) && price >= 0 ? price : undefined;
      }
    }
    if (typeof body.isActive === "boolean") existing.isActive = body.isActive;
    await existing.save();

    const courseCount = await countCoursesForSubject(existing);
    const questionCount = await countQuestionsForSubject(existing);

    return NextResponse.json({
      success: true,
      data: mapSubject(existing.toObject() as Record<string, unknown>, {
        courseCount,
        questionCount,
      }),
    });
  } catch (error) {
    console.error("Subject update error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update subject" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const authError = await requireCreateSubject();
    if (authError) return authError;

    await connectDB();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid subject ID" }, { status: 400 });
    }

    const deleted = await Subject.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: "Subject not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Subject delete error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete subject" },
      { status: 500 },
    );
  }
}

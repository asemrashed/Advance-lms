import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ResourceNote from "@/models/ResourceNote";
import { requireSessionUser } from "@/app/api/_lib/phase12";
import {
  assertResourceNoteStaffAccess,
  mapResourceNote,
  pickResourceNoteUpdate,
} from "@/app/api/_lib/resourceNotes";
import { applyScopeLabelsToUpdate } from "@/app/api/_lib/resourceWorksheets";
import { resolveNoteWorksheetAccessPolicy } from "@/app/api/_lib/resourceStaffAccess";
import { isAdminAreaRole } from "@/lib/roles";
import {
  RESOURCE_SCOPE_UNSET,
  resolveResourceSubject,
} from "@/app/api/_lib/resourceSubject";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;

    await connectDB();
    const { id } = await params;
    const access = await assertResourceNoteStaffAccess(id, auth.user);
    if (access.error) {
      return NextResponse.json(
        { success: false, error: access.error },
        { status: access.status ?? 403 },
      );
    }

    const note = await ResourceNote.findById(id)
      .populate("uploadedBy", "name email")
      .populate("batchId", "name subject")
      .populate("chapterId", "title subjectLabel")
      .populate("lessonId", "title")
      .populate("courseId", "title")
      .populate("chapterId", "title")
      .populate("lessonId", "title")
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        note: mapResourceNote(note as Record<string, unknown>, { canDownload: true }),
      },
    });
  } catch (error) {
    console.error("Get resource note error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;

    await connectDB();
    const { id } = await params;
    const access = await assertResourceNoteStaffAccess(id, auth.user);
    if (access.error) {
      return NextResponse.json(
        { success: false, error: access.error },
        { status: access.status ?? 403 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const existingCourseId =
      access.note?.courseId != null ? String(access.note.courseId) : undefined;
    const policyResult = await resolveNoteWorksheetAccessPolicy({
      user: auth.user,
      accessPolicyRaw: body.accessPolicy ?? access.note?.accessPolicy,
      courseId:
        typeof body.courseId === "string" ? body.courseId : existingCourseId,
    });
    if (policyResult.error) return policyResult.error;

    const update = await pickResourceNoteUpdate(body);
    update.accessPolicy = policyResult.accessPolicy;

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

    const updated = await ResourceNote.findByIdAndUpdate(id, mongoUpdate, {
      new: true,
      runValidators: true,
    })
      .populate("uploadedBy", "name email")
      .populate("batchId", "name subject")
      .populate("chapterId", "title subjectLabel")
      .populate("lessonId", "title")
      .populate("courseId", "title")
      .populate("chapterId", "title")
      .populate("lessonId", "title")
      .lean();

    return NextResponse.json({
      success: true,
      data: {
        note: mapResourceNote(updated as Record<string, unknown>, {
          canDownload: true,
        }),
      },
    });
  } catch (error) {
    console.error("Update resource note error:", error);
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
    const access = await assertResourceNoteStaffAccess(id, auth.user);
    if (access.error) {
      return NextResponse.json(
        { success: false, error: access.error },
        { status: access.status ?? 403 },
      );
    }

    await ResourceNote.findByIdAndDelete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete resource note error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

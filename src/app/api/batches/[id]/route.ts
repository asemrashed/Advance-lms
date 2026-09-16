import { NextRequest, NextResponse } from "next/server";
import Batch from "@/models/Batch";
import {
  countActivePaidEnrollmentsByBatchIds,
  mapBatch,
  requireBatchManageAccess,
  requireBatchViewAccess,
} from "@/app/api/_lib/batchAccess";
import { parseInstructorIdsInput } from "@/app/api/_lib/batchInstructors";
import { parseBatchMarketingBody } from "@/app/api/_lib/batchMarketing";
import {
  parseBatchDate,
  parseMaxStudents,
} from "@/app/api/_lib/batchFieldValidation";
import { normalizeBatchGrade } from "@/lib/batchGrades";
import { requireSessionUser } from "@/app/api/_lib/phase12";
import { imageUrlError } from "@/lib/imageUrl";
import { deleteReplacedUpload } from "@/lib/mediaStorage";
import {
  applyPermanentMeetLinkToBatchLiveClasses,
  inheritPermanentMeetLinkForCourse,
} from "@/app/api/_lib/batchMeetLink";
import { normalizeMeetLink } from "@/lib/meetLink";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireSessionUser(["admin", "instructor", "student"]);
    if (auth.error) return auth.error;

    const { id } = await context.params;
    const access = await requireBatchViewAccess(id, auth.user);
    if (access.error) return access.error;

    const countMap = await countActivePaidEnrollmentsByBatchIds([
      access.batch._id,
    ]);
    const batchId = String(access.batch._id);

    return NextResponse.json({
      success: true,
      data: {
        batch: mapBatch(access.batch as Record<string, unknown>, {
          enrolledCount: countMap.get(batchId) ?? 0,
        }),
        canManage: access.canManage,
        canManageRoutine: access.canManageRoutine,
        assignedSubjectIds: access.assignedSubjectIds ?? [],
      },
    });
  } catch (error) {
    console.error("GET /api/batches/[id]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch batch" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;

    const { id } = await context.params;
    const access = await requireBatchManageAccess(id, auth.user);
    if (access.error) return access.error;

    const body = (await request.json()) as Record<string, unknown>;
    const updates: Record<string, unknown> = {};
    const unsetFields: Record<string, string> = {};

    const existing = await Batch.findById(id)
      .select("courseId startDate endDate meetLink thumbnailUrl")
      .lean();
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Batch not found" },
        { status: 404 },
      );
    }

    const isCourseLinked = Boolean(existing.courseId);

    if (typeof body.name === "string") {
      const name = body.name.trim();
      if (!name) {
        return NextResponse.json(
          { success: false, error: "name cannot be blank" },
          { status: 400 },
        );
      }
      updates.name = name;
    }
    if (typeof body.subject === "string") updates.subject = body.subject.trim();
    const marketing = parseBatchMarketingBody(body);
    if (typeof body.description === "string") updates.description = body.description.trim();
    if (typeof body.shortDescription === "string") {
      updates.shortDescription = body.shortDescription.trim();
    }
    if (typeof body.thumbnailUrl === "string") {
      const thumbnailUrl = body.thumbnailUrl.trim();
      const thumbnailError = imageUrlError(thumbnailUrl);
      if (thumbnailError) {
        return NextResponse.json(
          { success: false, error: thumbnailError },
          { status: 400 },
        );
      }
      updates.thumbnailUrl = thumbnailUrl;
    }
    if (typeof body.videoUrl === "string") updates.videoUrl = body.videoUrl.trim();
    if (body.features !== undefined) updates.features = marketing.features;
    // Grade follows the parent course for course-linked batches.
    if (!isCourseLinked && body.grade !== undefined) {
      updates.grade = normalizeBatchGrade(body.grade);
    }
    if (typeof body.isActive === "boolean") updates.isActive = body.isActive;
    if (Array.isArray(body.schedule)) updates.schedule = body.schedule;
    if (typeof body.meetLink === "string") {
      updates.meetLink = normalizeMeetLink(body.meetLink);
    }

    if (body.instructorIds !== undefined || body.instructorId !== undefined) {
      const instructorParse = await parseInstructorIdsInput(body, auth.user);
      if (instructorParse.error) {
        return NextResponse.json(
          { success: false, error: instructorParse.error },
          { status: 400 },
        );
      }
      updates.instructorIds = instructorParse.ids;
      updates.instructorId = instructorParse.ids[0] ?? undefined;
    }

    let nextStart =
      existing.startDate instanceof Date
        ? existing.startDate
        : existing.startDate
          ? new Date(String(existing.startDate))
          : null;
    let nextEnd =
      existing.endDate instanceof Date
        ? existing.endDate
        : existing.endDate
          ? new Date(String(existing.endDate))
          : null;

    if (body.startDate !== undefined) {
      const parsed = parseBatchDate(body.startDate);
      if (!parsed) {
        return NextResponse.json(
          { success: false, error: "Valid startDate is required" },
          { status: 400 },
        );
      }
      updates.startDate = parsed;
      nextStart = parsed;
    }
    if (body.endDate !== undefined) {
      const parsed = parseBatchDate(body.endDate);
      if (!parsed) {
        return NextResponse.json(
          { success: false, error: "Valid endDate is required" },
          { status: 400 },
        );
      }
      updates.endDate = parsed;
      nextEnd = parsed;
    }
    if (
      nextStart &&
      nextEnd &&
      !Number.isNaN(nextStart.getTime()) &&
      !Number.isNaN(nextEnd.getTime()) &&
      nextStart.getTime() > nextEnd.getTime()
    ) {
      return NextResponse.json(
        { success: false, error: "startDate must be on or before endDate" },
        { status: 400 },
      );
    }

    if (body.maxStudents !== undefined) {
      const maxStudents = parseMaxStudents(body.maxStudents);
      if (maxStudents === null) {
        return NextResponse.json(
          { success: false, error: "maxStudents must be a positive integer" },
          { status: 400 },
        );
      }
      updates.maxStudents = maxStudents;
    }

    {
      if (body.monthlyFee !== undefined) {
        if (body.monthlyFee === null || body.monthlyFee === 0 || body.monthlyFee === "") {
          unsetFields.monthlyFee = "";
          delete updates.monthlyFee;
        } else {
          const monthlyFee = Number(body.monthlyFee);
          if (Number.isFinite(monthlyFee) && monthlyFee > 0) {
            updates.monthlyFee = monthlyFee;
          } else {
            unsetFields.monthlyFee = "";
            delete updates.monthlyFee;
          }
        }
      }
    }

    const mongoUpdate: Record<string, unknown> = { $set: updates };
    if (Object.keys(unsetFields).length > 0) {
      mongoUpdate.$unset = unsetFields;
    }

    const batch = await Batch.findByIdAndUpdate(
      id,
      mongoUpdate,
      { new: true, runValidators: true },
    ).lean();
    if (!batch) {
      return NextResponse.json(
        { success: false, error: "Batch not found" },
        { status: 404 },
      );
    }

    if (typeof updates.thumbnailUrl === "string") {
      void deleteReplacedUpload(
        existing.thumbnailUrl as string | undefined,
        updates.thumbnailUrl as string,
      );
    }

    if (typeof updates.meetLink === "string" && updates.meetLink) {
      await applyPermanentMeetLinkToBatchLiveClasses(
        id,
        String(updates.meetLink),
        existing.meetLink ? String(existing.meetLink) : undefined,
      );
      if (existing.courseId) {
        await inheritPermanentMeetLinkForCourse(String(existing.courseId));
      }
    }

    return NextResponse.json({
      success: true,
      data: { batch: mapBatch(batch as Record<string, unknown>) },
    });
  } catch (error) {
    console.error("PATCH /api/batches/[id]", error);
    return NextResponse.json(
      { success: false, error: "Failed to update batch" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;

    const { id } = await context.params;
    const access = await requireBatchManageAccess(id, auth.user);
    if (access.error) return access.error;

    await Batch.findByIdAndUpdate(id, { $set: { isActive: false } });

    return NextResponse.json({ success: true, data: { deactivated: true } });
  } catch (error) {
    console.error("DELETE /api/batches/[id]", error);
    return NextResponse.json(
      { success: false, error: "Failed to deactivate batch" },
      { status: 500 },
    );
  }
}

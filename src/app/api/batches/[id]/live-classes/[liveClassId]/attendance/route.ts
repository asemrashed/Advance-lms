import { NextRequest, NextResponse } from "next/server";
import Attendance from "@/models/Attendance";
import LiveClass from "@/models/LiveClass";
import User from "@/models/User";
import { requireBatchManageAccess } from "@/app/api/_lib/batchAccess";
import { listActivePaidBatchStudentIds } from "@/app/api/_lib/liveEnrollment";
import { getDisplayName } from "@/lib/displayName";
import { isObjectId, requireSessionUser, toObjectId } from "@/app/api/_lib/phase12";

type RouteContext = { params: Promise<{ id: string; liveClassId: string }> };

async function getLiveClassInBatch(batchId: string, liveClassId: string) {
  if (!isObjectId(liveClassId)) return null;
  return LiveClass.findOne({
    _id: liveClassId,
    batchId: toObjectId(batchId),
  })
    .select("_id title scheduledAt batchId")
    .lean();
}

/** GET — roster with attendance for a live class (instructor/admin). */
export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;

    const { id: batchId, liveClassId } = await context.params;
    const access = await requireBatchManageAccess(batchId, auth.user);
    if (access.error) return access.error;

    const liveClass = await getLiveClassInBatch(batchId, liveClassId);
    if (!liveClass) {
      return NextResponse.json(
        { success: false, error: "Live class not found" },
        { status: 404 },
      );
    }

    const studentIds = await listActivePaidBatchStudentIds(batchId);
    const students = studentIds.length
      ? await User.find({ _id: { $in: studentIds } })
          .select("name email")
          .lean()
      : [];

    const attendanceRows = await Attendance.find({
      liveClassId: liveClass._id,
      batchId: toObjectId(batchId),
    }).lean();

    const attendanceByStudent = new Map(
      attendanceRows.map((a) => [String(a.studentId), a]),
    );

    const roster = students.map((s) => {
      const sid = String(s._id);
      const att = attendanceByStudent.get(sid);
      const displayName = getDisplayName(s, s.email || sid);
      return {
        studentId: sid,
        name: displayName,
        email: s.email,
        status: att?.status ?? null,
        markedAt: att?.markedAt
          ? new Date(att.markedAt).toISOString()
          : undefined,
        attendanceId: att?._id ? String(att._id) : undefined,
      };
    });

    roster.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
    );

    return NextResponse.json({
      success: true,
      data: {
        liveClass: {
          _id: String(liveClass._id),
          title: liveClass.title,
          scheduledAt: new Date(liveClass.scheduledAt).toISOString(),
        },
        roster,
      },
    });
  } catch (error) {
    console.error("GET attendance", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch attendance" },
      { status: 500 },
    );
  }
}

/** PUT — bulk mark present/absent for enrolled students. */
export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;

    const { id: batchId, liveClassId } = await context.params;
    const access = await requireBatchManageAccess(batchId, auth.user);
    if (access.error) return access.error;

    const liveClass = await getLiveClassInBatch(batchId, liveClassId);
    if (!liveClass) {
      return NextResponse.json(
        { success: false, error: "Live class not found" },
        { status: 404 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const marks = Array.isArray(body.marks) ? body.marks : [];

    if (marks.length === 0) {
      return NextResponse.json(
        { success: false, error: "marks array is required" },
        { status: 400 },
      );
    }

    const enrolledIds = await listActivePaidBatchStudentIds(batchId);
    const enrolledSet = new Set(enrolledIds);

    const now = new Date();
    const results: { studentId: string; status: string }[] = [];

    for (const mark of marks) {
      if (!mark || typeof mark !== "object") continue;
      const row = mark as Record<string, unknown>;
      const studentId = typeof row.studentId === "string" ? row.studentId : "";
      const status =
        row.status === "absent"
          ? "absent"
          : row.status === "late"
            ? "late"
            : row.status === "present"
              ? "present"
              : "";

      if (!isObjectId(studentId) || !status || !enrolledSet.has(studentId)) {
        continue;
      }

      await Attendance.findOneAndUpdate(
        {
          liveClassId: liveClass._id,
          batchId: toObjectId(batchId),
          studentId: toObjectId(studentId),
        },
        {
          $set: {
            status,
            markedAt: now,
            markedBy: toObjectId(auth.user.id),
          },
        },
        { upsert: true, new: true },
      );

      results.push({ studentId, status });
    }

    return NextResponse.json({
      success: true,
      data: { updated: results.length, marks: results },
    });
  } catch (error) {
    console.error("PUT attendance", error);
    return NextResponse.json(
      { success: false, error: "Failed to save attendance" },
      { status: 500 },
    );
  }
}

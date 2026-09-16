import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import BatchEnrollment from "@/models/BatchEnrollment";
import Batch from "@/models/Batch";
import User from "@/models/User";
import { requireSessionUser } from "@/app/api/_lib/phase12";
import { getDisplayName } from "@/lib/displayName";

export async function GET() {
  try {
    const auth = await requireSessionUser(["super_admin"]);
    if (auth.error) return auth.error;

    await connectDB();

    const rows = await BatchEnrollment.find({
      paymentStatus: "paid",
      status: "suspended",
    })
      .sort({ enrolledAt: -1 })
      .lean();

    const batchIds = [...new Set(rows.map((r) => String(r.batchId)))];
    const studentIds = [...new Set(rows.map((r) => String(r.studentId)))];

    const [batches, students] = await Promise.all([
      Batch.find({ _id: { $in: batchIds } })
        .select("_id name subject maxStudents courseId")
        .lean(),
      User.find({ _id: { $in: studentIds } })
        .select("_id name phone")
        .lean(),
    ]);

    const batchById = new Map(batches.map((b) => [String(b._id), b]));
    const studentById = new Map(students.map((s) => [String(s._id), s]));

    const data = rows.map((row) => {
      const batch = batchById.get(String(row.batchId));
      const student = studentById.get(String(row.studentId));
      const studentName =
        getDisplayName(student) ||
        student?.name ||
        "Student";

      return {
        id: String(row._id),
        batchId: String(row.batchId),
        batchName: batch?.name ? String(batch.name) : undefined,
        batchSubject: batch?.subject ? String(batch.subject) : undefined,
        maxStudents: batch?.maxStudents ?? 0,
        studentId: String(row.studentId),
        studentName,
        studentPhone: student?.phone ? String(student.phone) : undefined,
        paymentId: row.paymentId ? String(row.paymentId) : undefined,
        paymentAmount: row.paymentAmount,
        enrolledAt: row.enrolledAt
          ? new Date(row.enrolledAt).toISOString()
          : undefined,
        reconcileNote: row.reconcileNote ? String(row.reconcileNote) : undefined,
      };
    });

    return NextResponse.json({ success: true, data: { enrollments: data, total: data.length } });
  } catch (error) {
    console.error("GET batch-enrollments reconcile error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load reconciliation queue" },
      { status: 500 },
    );
  }
}

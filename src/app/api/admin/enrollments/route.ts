import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import Enrollment from "@/models/Enrollment";
import User from "@/models/User";
import Course from "@/models/Course";
import Payment from "@/models/Payment";
import { getDisplayName } from "@/lib/displayName";
import { normalizeCourseType } from "@/lib/courses/unifiedCourse";
import { paymentDueAtForPendingLive } from "@/app/api/_lib/runningCoursePayment";
import { isValidEmail, normalizeEmail } from "@/lib/email";
import { isValidBdPhone, toBdLocalPhone } from "@/lib/phone";
import { accountStatusToFlags } from "@/lib/accountStatus";
import { MANUAL_ENROLL_STUDENT_PASSWORD } from "@/lib/adminPermissions";
import {
  coursePricingFromLean,
  resolveCourseAmountForPlan,
} from "@/lib/courses/liveCoursePricing";
import { upsertApprovedStudentPricing } from "@/lib/courses/studentPricing";
import { normalizeBillingPlan, computeAccessExpiry } from "@/lib/subscription/plan";
import { makeTransactionId } from "@/app/api/_lib/paymentShared";
import { sendManualEnrollmentEmail } from "@/lib/mail";
import {
  buildEnrollmentStats,
  mapEnrollmentRow,
  requireAdminJson,
  requireEnrollStudentsJson,
  toPositiveInt,
} from "./_lib";

async function resolveOrCreateStudent(
  body: Record<string, unknown>,
): Promise<{ id: string; created: boolean } | { error: string; status: number }> {
  const studentId = String(body.student || "").trim();
  if (studentId && mongoose.Types.ObjectId.isValid(studentId)) {
    const student = await User.findOne({ _id: studentId, role: "student" })
      .select("_id")
      .lean();
    if (!student) return { error: "Student not found", status: 404 };
    return { id: String(student._id), created: false };
  }

  const guest =
    body.newStudent && typeof body.newStudent === "object"
      ? (body.newStudent as Record<string, unknown>)
      : body;
  const name = String(guest.name || body.studentName || "").trim();
  const emailClean = normalizeEmail(String(guest.email || body.email || ""));
  const phoneRaw = String(guest.phone || body.phone || "").trim();
  const phoneClean = phoneRaw ? toBdLocalPhone(phoneRaw) : "";

  if (!name) return { error: "Student name is required", status: 400 };
  if (!isValidEmail(emailClean)) {
    return { error: "A valid student email is required", status: 400 };
  }
  if (!phoneClean || !isValidBdPhone(phoneClean)) {
    return {
      error: "Student phone is required and must be like 01XXXXXXXXX",
      status: 400,
    };
  }

  const existingEmail = await User.findOne({ email: emailClean })
    .select("_id role")
    .lean();
  if (existingEmail) {
    if (existingEmail.role !== "student") {
      return {
        error: "This email already belongs to a non-student account",
        status: 409,
      };
    }
    return { id: String(existingEmail._id), created: false };
  }

  const existingPhone = await User.findOne({ phone: phoneClean })
    .select("_id role")
    .lean();
  if (existingPhone) {
    if (existingPhone.role !== "student") {
      return {
        error: "This phone already belongs to a non-student account",
        status: 409,
      };
    }
    return { id: String(existingPhone._id), created: false };
  }

  const hashed = await bcrypt.hash(MANUAL_ENROLL_STUDENT_PASSWORD, 12);
  const created = await User.create({
    name,
    email: emailClean,
    phone: phoneClean,
    password: hashed,
    role: "student",
    ...accountStatusToFlags("active"),
  });
  return { id: String(created._id), created: true };
}

function parseDueAt(value: unknown): Date | null | undefined {
  if (value === null) return null;
  if (typeof value !== "string" || !value.trim()) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminJson();
    if ("error" in auth && auth.error) return auth.error;

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = toPositiveInt(searchParams.get("page"), 1);
    const limit = Math.min(toPositiveInt(searchParams.get("limit"), 10), 100);
    const search = String(searchParams.get("search") || "").trim();
    const status = searchParams.get("status");
    const paymentStatus = searchParams.get("paymentStatus");
    const courseFilter = searchParams.get("course");

    const match: Record<string, unknown> = {};
    if (status) match.status = status;
    if (paymentStatus) match.paymentStatus = paymentStatus;
    if (courseFilter && mongoose.Types.ObjectId.isValid(courseFilter)) {
      match.course = new mongoose.Types.ObjectId(courseFilter);
    }

    const allRows = await Enrollment.find(match)
      .populate({
        path: "course",
        select:
          "title shortDescription description thumbnailUrl category isPaid price instructor createdBy",
      })
      .populate({
        path: "student",
        select: "name email avatar phone",
      })
      .sort({ enrolledAt: -1 })
      .lean();

    let filtered = allRows as unknown as Array<Record<string, unknown>>;
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter((row) => {
        const student = row.student as Record<string, unknown> | null;
        const course = row.course as Record<string, unknown> | null;
        const studentText = student
          ? `${getDisplayName(student)} ${student.email || ""} ${student.phone || ""}`
          : "";
        const courseText = course ? String(course.title || "") : "";
        return (
          studentText.toLowerCase().includes(q) ||
          courseText.toLowerCase().includes(q)
        );
      });
    }

    const total = filtered.length;
    const pages = total > 0 ? Math.ceil(total / limit) : 0;
    const skip = (page - 1) * limit;
    const pageRows = filtered.slice(skip, skip + limit);
    const stats = buildEnrollmentStats(filtered);

    return NextResponse.json({
      success: true,
      data: {
        enrollments: pageRows.map(mapEnrollmentRow),
        pagination: {
          page,
          limit,
          total,
          pages,
          hasNext: page < pages,
          hasPrev: page > 1,
        },
        stats,
      },
    });
  } catch (error) {
    console.error("Admin enrollments list error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch enrollments" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireEnrollStudentsJson();
    if ("error" in auth && auth.error) return auth.error;

    const body = (await request.json()) as Record<string, unknown>;
    const courseId = String(body.course || "").trim();

    if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
      return NextResponse.json(
        { success: false, error: "Valid course is required" },
        { status: 400 },
      );
    }

    await connectDB();

    const studentResult = await resolveOrCreateStudent(body);
    if ("error" in studentResult) {
      return NextResponse.json(
        { success: false, error: studentResult.error },
        { status: studentResult.status },
      );
    }
    const studentId = studentResult.id;
    const createdGuest = studentResult.created;

    const courseDoc = await Course.findById(courseId)
      .select("isPaid price salePrice monthlyPrice status isHidden courseType")
      .lean();
    if (!courseDoc || courseDoc.isHidden) {
      return NextResponse.json(
        { success: false, error: "Course not found" },
        { status: 404 },
      );
    }

    const existing = await Enrollment.findOne({
      student: studentId,
      course: courseId,
    }).lean();
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Student is already enrolled in this course" },
        { status: 409 },
      );
    }

    const billingPlan = normalizeBillingPlan(body.billingPlan);
    const isPaid = Boolean(courseDoc.isPaid);
    const listAmount = resolveCourseAmountForPlan(
      coursePricingFromLean(courseDoc),
      billingPlan,
    );
    const paymentAmount =
      typeof body.paymentAmount === "number"
        ? Math.max(0, body.paymentAmount)
        : isPaid
          ? listAmount
          : 0;
    const paymentStatus =
      typeof body.paymentStatus === "string"
        ? body.paymentStatus
        : isPaid && paymentAmount > 0
          ? "pending"
          : "paid";
    const paymentMethod =
      typeof body.paymentMethod === "string" && body.paymentMethod.trim()
        ? body.paymentMethod.trim()
        : paymentStatus === "paid"
          ? "cash"
          : undefined;
    const isLivePending =
      isPaid &&
      paymentStatus === "pending" &&
      normalizeCourseType(courseDoc.courseType) === "live";
    const requestedDue = parseDueAt(body.paymentDueAt);
    const paymentDueAt =
      requestedDue === null
        ? undefined
        : requestedDue || (isLivePending ? paymentDueAtForPendingLive() : undefined);

    const lockPrice = body.lockPrice !== false;
    if (lockPrice && isPaid) {
      await upsertApprovedStudentPricing({
        studentId,
        courseId,
        billingPlan,
        approvedAmount: paymentAmount,
        listPrice: listAmount,
        approvedBy: auth.userId,
        note: "Fixed price from admin manual enrollment",
      });
    }

    const now = new Date();
    const accessExpiresAt =
      paymentStatus === "paid"
        ? computeAccessExpiry(billingPlan, null, now)
        : undefined;

    const enrollment = await Enrollment.create({
      student: studentId,
      course: courseId,
      status: "enrolled",
      paymentStatus,
      paymentAmount,
      paymentMethod,
      billingPlan,
      notes: typeof body.notes === "string" ? body.notes : undefined,
      ...(paymentDueAt ? { paymentDueAt } : {}),
      ...(accessExpiresAt ? { accessExpiresAt } : {}),
    });

    if (paymentStatus === "paid" && paymentAmount > 0) {
      const transactionId = makeTransactionId(studentId, true);
      const gateway = paymentMethod === "online" ? "sslcommerz" : "cash";
      await Payment.create({
        user: studentId,
        entityType: "course",
        course: courseId,
        enrollment: enrollment._id,
        billingPlan,
        amount: paymentAmount,
        originalAmount: listAmount !== paymentAmount ? listAmount : undefined,
        discountApplied: paymentAmount < listAmount,
        transactionId,
        gateway,
        gatewayOrderId: transactionId,
        status: "success",
      });
      enrollment.paymentId = transactionId;
      await enrollment.save();
    }

    const populated = await Enrollment.findById(enrollment._id)
      .populate({
        path: "course",
        select:
          "title shortDescription description thumbnailUrl category isPaid price",
      })
      .populate({
        path: "student",
        select: "name email avatar",
      })
      .lean();

    if (!populated) {
      return NextResponse.json(
        { success: false, error: "Failed to load enrollment" },
        { status: 500 },
      );
    }

    let mailWarning: string | undefined;
    if (createdGuest) {
      const studentDoc = populated.student as
        | { name?: string; email?: string }
        | null
        | undefined;
      const courseDocPop = populated.course as { title?: string } | null | undefined;
      const to = String(studentDoc?.email || "").trim();
      if (to) {
        try {
          await sendManualEnrollmentEmail({
            to,
            name: getDisplayName(studentDoc || {}, to),
            courseTitle: String(courseDocPop?.title || "your course"),
            temporaryPassword: MANUAL_ENROLL_STUDENT_PASSWORD,
            paymentStatus:
              typeof populated.paymentStatus === "string"
                ? populated.paymentStatus
                : paymentStatus,
            paymentAmount:
              typeof populated.paymentAmount === "number"
                ? populated.paymentAmount
                : paymentAmount,
          });
        } catch (mailError) {
          console.error("[admin/enrollments] enrollment email failed", mailError);
          mailWarning =
            "Enrollment created but the confirmation email failed to send. Share the login password manually.";
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: mapEnrollmentRow(populated as unknown as Record<string, unknown>),
        ...(createdGuest
          ? { temporaryPassword: MANUAL_ENROLL_STUDENT_PASSWORD }
          : {}),
        ...(mailWarning ? { warning: mailWarning } : {}),
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: number }).code === 11000
    ) {
      return NextResponse.json(
        { success: false, error: "Student is already enrolled in this course" },
        { status: 409 },
      );
    }
    console.error("Admin enrollment create error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create enrollment" },
      { status: 500 },
    );
  }
}

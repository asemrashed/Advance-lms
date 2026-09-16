import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth/next";
import connectDB from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import User from "@/models/User";
import Enrollment from "@/models/Enrollment";
import BatchEnrollment from "@/models/BatchEnrollment";
import Batch from "@/models/Batch";
import { instructorAccessibleCourseIds } from "@/app/api/_lib/instructorCourses";
import { getDisplayName, resolveNameFromBody } from "@/lib/displayName";
import {
  escapeRegex,
} from "@/app/api/_lib/phase12";

function toPositiveInt(value: string | null, fallback: number): number {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function cleanPhone(phone: string): string {
  return String(phone).replace(/[\s\-\(\)]/g, "");
}

function isValidBdPhone(phone: string): boolean {
  return /^01\d{9}$/.test(cleanPhone(phone));
}

async function requireInstructorJson() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return {
      error: NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      ),
    };
  }
  if (session.user.role !== "instructor") {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }
  return { userId: session.user.id };
}

function mapStudent(
  user: Record<string, unknown>,
  extras?: {
    enrollmentCount?: number;
    totalEnrolledAmount?: number;
    enrollmentDate?: Date;
  },
) {
  const address =
    typeof user.address === "string" && user.address.trim()
      ? { fullAddress: user.address }
      : undefined;

  return {
    _id: String(user._id),
    email: String(user.email || ""),
    phone: user.phone ? String(user.phone) : undefined,
    name: getDisplayName(user),
    role: "student" as const,
    isActive: user.isActive !== false,
    avatar: user.avatar ? String(user.avatar) : undefined,
    parentPhone: user.parentPhone ? String(user.parentPhone) : undefined,
    address,
    enrollmentDate: extras?.enrollmentDate,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLogin: user.lastLogin,
    enrollmentCount: extras?.enrollmentCount ?? 0,
    totalEnrolledAmount: extras?.totalEnrolledAmount ?? 0,
  };
}

type StudentEnrollmentRollup = {
  _id: mongoose.Types.ObjectId;
  enrollmentCount: number;
  totalEnrolledAmount: number;
  firstEnrolledAt: Date;
};

export async function GET(request: NextRequest) {
  try {
    const auth = await requireInstructorJson();
    if ("error" in auth && auth.error) return auth.error;
    const userId = auth.userId!;

    await connectDB();
    const courseIds = await instructorAccessibleCourseIds(userId);

    if (courseIds.length === 0) {
      return NextResponse.json({
        students: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 0 },
        stats: {
          totalStudents: 0,
          activeStudents: 0,
          inactiveStudents: 0,
          totalEnrolledAmount: 0,
          totalEnrollments: 0,
          enrolledThisMonth: 0,
        },
      });
    }

    const { searchParams } = new URL(request.url);
    const page = toPositiveInt(searchParams.get("page"), 1);
    const limit = Math.min(toPositiveInt(searchParams.get("limit"), 10), 500);
    const search = String(searchParams.get("search") || "").trim();
    const status = searchParams.get("status");
    const courseFilter = String(searchParams.get("course") || "").trim();
    const batchFilter = String(searchParams.get("batch") || "").trim();

    const batches = await Batch.find({ courseId: { $in: courseIds } })
      .select("_id courseId")
      .lean();
    let batchIds = batches.map((b) => b._id as mongoose.Types.ObjectId);

    if (batchFilter && mongoose.Types.ObjectId.isValid(batchFilter)) {
      batchIds = batchIds.filter((id) => String(id) === batchFilter);
    }

    let scopedCourseIds = courseIds;
    if (courseFilter && mongoose.Types.ObjectId.isValid(courseFilter)) {
      scopedCourseIds = courseIds.filter((id) => String(id) === courseFilter);
      batchIds = batches
        .filter((b) => String(b.courseId) === courseFilter)
        .map((b) => b._id as mongoose.Types.ObjectId);
      if (batchFilter && mongoose.Types.ObjectId.isValid(batchFilter)) {
        batchIds = batchIds.filter((id) => String(id) === batchFilter);
      }
    }

    const [courseRollups, batchRollups] = await Promise.all([
      scopedCourseIds.length && !(batchFilter && mongoose.Types.ObjectId.isValid(batchFilter))
        ? Enrollment.aggregate<StudentEnrollmentRollup>([
            { $match: { course: { $in: scopedCourseIds } } },
            {
              $group: {
                _id: "$student",
                enrollmentCount: { $sum: 1 },
                totalEnrolledAmount: {
                  $sum: {
                    $cond: [
                      { $eq: ["$paymentStatus", "paid"] },
                      { $ifNull: ["$paymentAmount", 0] },
                      0,
                    ],
                  },
                },
                firstEnrolledAt: { $min: "$enrolledAt" },
              },
            },
          ])
        : Promise.resolve([] as StudentEnrollmentRollup[]),
      batchIds.length
        ? BatchEnrollment.aggregate<StudentEnrollmentRollup>([
            {
              $match: {
                batchId: { $in: batchIds },
                status: { $nin: ["dropped"] },
              },
            },
            {
              $group: {
                _id: "$studentId",
                enrollmentCount: { $sum: 1 },
                totalEnrolledAmount: {
                  $sum: {
                    $cond: [
                      { $eq: ["$paymentStatus", "paid"] },
                      { $ifNull: ["$paymentAmount", 0] },
                      0,
                    ],
                  },
                },
                firstEnrolledAt: { $min: "$enrolledAt" },
              },
            },
          ])
        : Promise.resolve([] as StudentEnrollmentRollup[]),
    ]);

    const rollupMap = new Map<
      string,
      {
        enrollmentCount: number;
        totalEnrolledAmount: number;
        firstEnrolledAt: Date;
      }
    >();

    for (const r of [...courseRollups, ...batchRollups]) {
      const key = String(r._id);
      const existing = rollupMap.get(key);
      if (!existing) {
        rollupMap.set(key, {
          enrollmentCount: r.enrollmentCount,
          totalEnrolledAmount: r.totalEnrolledAmount,
          firstEnrolledAt: r.firstEnrolledAt,
        });
      } else {
        rollupMap.set(key, {
          enrollmentCount: existing.enrollmentCount + r.enrollmentCount,
          totalEnrolledAmount:
            existing.totalEnrolledAmount + r.totalEnrolledAmount,
          firstEnrolledAt:
            existing.firstEnrolledAt < r.firstEnrolledAt
              ? existing.firstEnrolledAt
              : r.firstEnrolledAt,
        });
      }
    }

    const studentIds = [...rollupMap.keys()].map(
      (id) => new mongoose.Types.ObjectId(id),
    );

    const userFilter: Record<string, unknown> = {
      _id: { $in: studentIds },
      role: "student",
    };

    if (status === "active") userFilter.isActive = true;
    if (status === "inactive") userFilter.isActive = false;

    if (search) {
      const orClause: Record<string, unknown>[] = [
        { name: { $regex: escapeRegex(search), $options: "i" } },
        { phone: { $regex: escapeRegex(search), $options: "i" } },
        { email: { $regex: escapeRegex(search), $options: "i" } },
      ];
      if (mongoose.Types.ObjectId.isValid(search)) {
        orClause.push({ _id: new mongoose.Types.ObjectId(search) });
      }
      userFilter.$or = orClause;
    }

    const allMatchingUsers = await User.find(userFilter)
      .select("-password")
      .sort({ createdAt: -1 })
      .lean();

    const studentsAll = allMatchingUsers.map((u) => {
      const rollup = rollupMap.get(String(u._id));
      return mapStudent(u as Record<string, unknown>, {
        enrollmentCount: rollup?.enrollmentCount,
        totalEnrolledAmount: rollup?.totalEnrolledAmount,
        enrollmentDate: rollup?.firstEnrolledAt,
      });
    });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats = {
      totalStudents: studentsAll.length,
      activeStudents: studentsAll.filter((s) => s.isActive).length,
      inactiveStudents: studentsAll.filter((s) => !s.isActive).length,
      totalEnrolledAmount: studentsAll.reduce(
        (sum, s) => sum + (s.totalEnrolledAmount || 0),
        0,
      ),
      totalEnrollments: studentsAll.reduce(
        (sum, s) => sum + (s.enrollmentCount || 0),
        0,
      ),
      enrolledThisMonth: studentsAll.filter((s) => {
        const d = s.enrollmentDate ? new Date(s.enrollmentDate) : null;
        return d && d >= monthStart;
      }).length,
    };

    const total = studentsAll.length;
    const pages = total > 0 ? Math.ceil(total / limit) : 0;
    const skip = (page - 1) * limit;
    const students = studentsAll.slice(skip, skip + limit);

    return NextResponse.json({
      students,
      pagination: { page, limit, total, pages },
      stats,
    });
  } catch (error) {
    console.error("Get instructor students error:", error);
    return NextResponse.json(
      { error: "Failed to fetch students" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireInstructorJson();
    if ("error" in auth && auth.error) return auth.error;

    await connectDB();
    const body = (await request.json()) as Record<string, unknown>;
    const name = resolveNameFromBody(body);
    const phoneClean = cleanPhone(String(body.phone || ""));

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 },
      );
    }
    if (!isValidBdPhone(phoneClean)) {
      return NextResponse.json(
        { error: "Phone number must start with 0 and be like 01XXXXXXXXX" },
        { status: 400 },
      );
    }

    const password = String(body.password || "");
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 },
      );
    }

    const existing = await User.findOne({ phone: phoneClean }).select("_id").lean();
    if (existing) {
      return NextResponse.json(
        { error: "User already exists with this phone number" },
        { status: 409 },
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const isActive = body.isActive !== false;

    const user = await User.create({
      name,
      phone: phoneClean,
      password: hashedPassword,
      role: "student",
      isActive,
      avatar:
        typeof body.avatar === "string" && body.avatar.trim()
          ? body.avatar.trim()
          : undefined,
      parentPhone:
        typeof body.parentPhone === "string" && body.parentPhone.trim()
          ? cleanPhone(body.parentPhone)
          : undefined,
      address:
        typeof body.address === "object" &&
        body.address &&
        typeof (body.address as { fullAddress?: string }).fullAddress === "string"
          ? String((body.address as { fullAddress: string }).fullAddress).trim()
          : undefined,
    });

    return NextResponse.json(
      {
        message: "Student created successfully",
        student: mapStudent(user.toObject()),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Create instructor student error:", error);
    return NextResponse.json(
      { error: "Failed to create student" },
      { status: 500 },
    );
  }
}

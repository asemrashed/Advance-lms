import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import connectDB from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import Course from "@/models/Course";
import { normalizeCourseType } from "@/lib/courses/unifiedCourse";
import type { CourseType } from "@/types/unifiedCourse";
import { parseFeaturesInput } from "@/app/api/_lib/batchMarketing";
import {
  buildSubjectFieldsFromBody,
  enrichSubjectFields,
  resolveSubjectByName,
} from "@/app/api/_lib/subjects";
import { isBatchGrade, normalizeBatchGrade } from "@/lib/batchGrades";
import { imageUrlError } from "@/lib/imageUrl";
import {
  deleteReplacedUpload,
  deleteUploadByUrl,
} from "@/lib/mediaStorage";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function toObjectId(value: unknown): mongoose.Types.ObjectId | null {
  if (typeof value !== "string" || !mongoose.Types.ObjectId.isValid(value)) {
    return null;
  }
  return new mongoose.Types.ObjectId(value);
}

function mapCourse(course: Record<string, unknown>, hasPriorApproval = false) {
  const createdBy = course.createdBy as Record<string, unknown> | null | undefined;
  const instructor = course.instructor as Record<string, unknown> | null | undefined;
  const price = typeof course.price === "number" ? course.price : 0;
  const salePrice =
    typeof course.salePrice === "number" ? course.salePrice : undefined;
  const monthlyPrice =
    typeof course.monthlyPrice === "number" && course.monthlyPrice > 0
      ? course.monthlyPrice
      : undefined;
  const isPaid = Boolean(course.isPaid);
  const finalPrice = isPaid ? (salePrice ?? price) : 0;
  const discountPercentage =
    isPaid && salePrice !== undefined && price > 0 && salePrice < price
      ? Math.round(((price - salePrice) / price) * 100)
      : 0;

  return {
    _id: String(course._id),
    courseType: normalizeCourseType(course.courseType) as CourseType,
    title: course.title || "",
    shortDescription: course.shortDescription || undefined,
    description: course.description || undefined,
    category: course.category || undefined,
    subjectId: course.subjectId ? String(course.subjectId) : undefined,
    subjectCode: course.subjectCode || undefined,
    subjectName: course.subjectName || undefined,
    grade: course.grade || undefined,
    thumbnailUrl: course.thumbnailUrl || undefined,
    isPaid,
    status: (course.status || "draft") as
      | "draft"
      | "published"
      | "archived"
      | "pending_approval",
    hasPriorApproval,
    isHidden: Boolean(course.isHidden),
    price,
    salePrice,
    monthlyPrice,
    finalPrice,
    discountPercentage,
    displayOrder:
      typeof course.displayOrder === "number" ? course.displayOrder : undefined,
    duration: typeof course.duration === "number" ? course.duration : undefined,
    difficulty: course.difficulty || undefined,
    lessonCount: typeof course.lessonCount === "number" ? course.lessonCount : 0,
    enrollmentCount:
      typeof course.enrollmentCount === "number" ? course.enrollmentCount : 0,
    tags: Array.isArray(course.tags) ? course.tags : [],
    features: Array.isArray(course.features)
      ? course.features.map((f: unknown) => String(f)).filter(Boolean)
      : [],
    createdBy: createdBy
      ? {
          _id: String(createdBy._id || ""),
          name: String(createdBy.name || ""),
          email: String(createdBy.email || ""),
          role: String(createdBy.role || ""),
        }
      : undefined,
    instructor: instructor
      ? {
          _id: String(instructor._id || ""),
          name:
            String(instructor.name || "").trim() ||
            getInstructorDisplayName(instructor as Record<string, unknown>),
          email: String(instructor.email || ""),
          role: String(instructor.role || "instructor"),
        }
      : undefined,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
  };
}

async function getAuthContext() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const role = session?.user?.role;
  return { userId, role };
}

import { canManageCourse } from "@/app/api/_lib/courseAccess";
import { getInstructorDisplayName } from "@/app/api/_lib/instructorProfile";
import { isAdminAreaRole } from "@/lib/roles";
import {
  hasApprovedCourseRequest,
  upsertPendingContentRequest,
  withdrawPendingContentRequests,
} from "@/app/api/_lib/contentApproval";

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { userId, role } = await getAuthContext();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }
    if (!isAdminAreaRole(role) && role !== "instructor") {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    await connectDB();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid course ID" },
        { status: 400 },
      );
    }

    const course = await Course.findById(id)
      .populate("createdBy", "name email role")
      .populate("instructor", "name email role")
      .lean();
    if (!course) {
      return NextResponse.json(
        { success: false, error: "Course not found" },
        { status: 404 },
      );
    }
    if (!canManageCourse(course, userId, role || "")) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const hasPriorApproval = await hasApprovedCourseRequest(id);
    return NextResponse.json({
      success: true,
      data: mapCourse(course, hasPriorApproval),
    });
  } catch (error) {
    console.error("Course read error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch course" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId, role } = await getAuthContext();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }
    if (!isAdminAreaRole(role) && role !== "instructor") {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    await connectDB();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid course ID" },
        { status: 400 },
      );
    }

    const existing = await Course.findById(id).lean();
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Course not found" },
        { status: 404 },
      );
    }
    if (!canManageCourse(existing, userId, role || "")) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const updateData: Record<string, unknown> = {};
    const unsetFields: Record<string, ""> = {};
    let submitForApproval = false;
    let withdrawApproval = false;
    let hasPriorApproval = false;

    if (typeof body.title === "string") updateData.title = body.title.trim();
    if (typeof body.shortDescription === "string") {
      updateData.shortDescription = body.shortDescription.trim();
    }
    if (typeof body.description === "string") {
      updateData.description = body.description.trim();
    }
    if (typeof body.category === "string") updateData.category = body.category.trim();

    const subjectInput = buildSubjectFieldsFromBody(body);
    if (
      subjectInput.subjectId ||
      subjectInput.subjectCode ||
      subjectInput.subjectName
    ) {
      const subjectFields = await enrichSubjectFields(subjectInput);
      if (subjectFields.subjectId) {
        updateData.subjectId = new mongoose.Types.ObjectId(subjectFields.subjectId);
      }
      if (subjectFields.subjectCode) updateData.subjectCode = subjectFields.subjectCode;
      if (subjectFields.subjectName) {
        updateData.subjectName = subjectFields.subjectName;
        if (!updateData.category) updateData.category = subjectFields.subjectName;
      }
    } else if (typeof body.category === "string" && body.category.trim()) {
      const matched = await resolveSubjectByName(body.category.trim());
      if (matched) {
        updateData.subjectId = matched._id;
        updateData.subjectCode = String(matched.code || "");
        updateData.subjectName = String(matched.name || "");
        updateData.category = String(matched.name || body.category).trim();
      }
    }

    if (typeof body.grade === "string") {
      const rawGrade = body.grade.trim();
      if (!rawGrade) {
        unsetFields.grade = "";
      } else if (isBatchGrade(rawGrade)) {
        updateData.grade = normalizeBatchGrade(rawGrade);
      } else {
        updateData.grade = rawGrade.toUpperCase();
      }
    } else if (body.grade === null) {
      unsetFields.grade = "";
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
      updateData.thumbnailUrl = thumbnailUrl;
    }
    if (typeof body.isPaid === "boolean") updateData.isPaid = body.isPaid;
    if (body.courseType === "recorded" || body.courseType === "live") {
      updateData.courseType = body.courseType;
    }
    if (typeof body.isHidden === "boolean") updateData.isHidden = body.isHidden;
    if (
      body.status === "draft" ||
      body.status === "published" ||
      body.status === "archived" ||
      body.status === "pending_approval"
    ) {
      if (role === "instructor") {
        if (body.status === "published") {
          hasPriorApproval = await hasApprovedCourseRequest(id);
          if (hasPriorApproval) {
            updateData.status = "published";
          } else {
            updateData.status = "pending_approval";
            submitForApproval = true;
          }
        } else if (
          body.status === "draft" ||
          body.status === "pending_approval"
        ) {
          updateData.status = body.status;
          if (body.status === "draft") {
            withdrawApproval = true;
          }
        }
      } else {
        updateData.status = body.status;
        if (body.status === "draft") {
          withdrawApproval = true;
        }
      }
    }
    if (typeof body.price === "number") updateData.price = body.price;
    if (typeof body.salePrice === "number") {
      updateData.salePrice = body.salePrice;
    } else if (body.salePrice === null) {
      unsetFields.salePrice = "";
    }
    if (typeof body.monthlyPrice === "number" && body.monthlyPrice > 0) {
      updateData.monthlyPrice = body.monthlyPrice;
    } else if (body.monthlyPrice === null || body.monthlyPrice === 0) {
      unsetFields.monthlyPrice = "";
      delete updateData.monthlyPrice;
    }
    if (typeof body.displayOrder === "number") {
      updateData.displayOrder = body.displayOrder;
    }
    if (body.features !== undefined) {
      updateData.features = parseFeaturesInput(body.features);
    }

    if (isAdminAreaRole(role)) {
      const instructorId = toObjectId(body.instructor);
      if (instructorId) {
        updateData.instructor = instructorId;
      } else if (body.instructor === null) {
        updateData.instructor = undefined;
      }
    } else if (role === "instructor") {
      updateData.instructor = new mongoose.Types.ObjectId(userId);
    }

    if (updateData.isPaid === false) {
      unsetFields.price = "";
      unsetFields.salePrice = "";
      unsetFields.monthlyPrice = "";
      delete updateData.price;
      delete updateData.salePrice;
      delete updateData.monthlyPrice;
    }

    const mongoUpdate: Record<string, unknown> = { $set: updateData };
    if (Object.keys(unsetFields).length > 0) {
      mongoUpdate.$unset = unsetFields;
    }

    const updated = await Course.findByIdAndUpdate(id, mongoUpdate, {
      new: true,
      runValidators: true,
    })
      .populate("createdBy", "name email role")
      .populate("instructor", "name email role")
      .lean();

    if (submitForApproval && role === "instructor") {
      await upsertPendingContentRequest({
        type: "course",
        courseId: id,
        requestedBy: userId,
      });
    } else if (withdrawApproval) {
      await withdrawPendingContentRequests({
        type: "course",
        courseId: id,
      });
    }

    if (!hasPriorApproval) {
      hasPriorApproval = await hasApprovedCourseRequest(id);
    }

    if (typeof updateData.thumbnailUrl === "string") {
      void deleteReplacedUpload(
        existing.thumbnailUrl as string | undefined,
        updateData.thumbnailUrl as string,
      );
    }

    return NextResponse.json({
      success: true,
      data: mapCourse(updated, hasPriorApproval),
    });
  } catch (error) {
    console.error("Course update error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update course" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { userId, role } = await getAuthContext();
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 },
      );
    }
    if (!isAdminAreaRole(role) && role !== "instructor") {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    await connectDB();
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid course ID" },
        { status: 400 },
      );
    }

    const existing = await Course.findById(id).lean();
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Course not found" },
        { status: 404 },
      );
    }
    if (!canManageCourse(existing, userId, role || "")) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    if (existing.thumbnailUrl) {
      void deleteUploadByUrl(String(existing.thumbnailUrl)).catch(() => {});
    }

    await Course.findByIdAndDelete(id);
    return NextResponse.json({ success: true, data: { _id: id } });
  } catch (error) {
    console.error("Course delete error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete course" },
      { status: 500 },
    );
  }
}

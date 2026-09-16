import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Batch from "@/models/Batch";
import BatchEnrollment from "@/models/BatchEnrollment";
import Course from "@/models/Course";
import { INSTRUCTOR_USER_SELECT } from "@/app/api/_lib/instructorProfile";
import { listRoutineSlotsForBatch } from "@/app/api/_lib/batchAccess";
import {
  mapPublicBatch,
  publicBatchDetailExtras,
} from "@/app/api/_lib/mapPublicBatch";

type RouteContext = { params: Promise<{ id: string }> };

/** GET /api/public/batches/[id] — single active batch for public enroll page. */
export async function GET(_request: NextRequest, { params }: RouteContext) {
  try {
    await connectDB();

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid batch id" },
        { status: 400 },
      );
    }

    const batch = await Batch.findOne({
      _id: id,
      isActive: true,
    })
      .populate("instructorId", INSTRUCTOR_USER_SELECT)
      .lean();

    if (!batch) {
      return NextResponse.json(
        { success: false, error: "Batch not found or not available" },
        { status: 404 },
      );
    }

    const enrolledCount = await BatchEnrollment.countDocuments({
      batchId: batch._id,
      status: "active",
      paymentStatus: "paid",
    });

    const parentCourse = batch.courseId
      ? await Course.findById(batch.courseId)
          .select("isPaid price salePrice")
          .lean()
      : null;

    const mapped = mapPublicBatch(
      batch as Record<string, unknown>,
      enrolledCount,
      parentCourse,
    );
    const slots = await listRoutineSlotsForBatch(id);

    return NextResponse.json({
      success: true,
      data: {
        batch: mapped,
        ...publicBatchDetailExtras(slots),
      },
    });
  } catch (error) {
    console.error("GET /api/public/batches/[id]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch batch" },
      { status: 500 },
    );
  }
}

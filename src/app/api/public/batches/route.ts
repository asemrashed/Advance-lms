import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import Batch from "@/models/Batch";
import BatchEnrollment from "@/models/BatchEnrollment";
import Course from "@/models/Course";
import { INSTRUCTOR_USER_SELECT } from "@/app/api/_lib/instructorProfile";
import { mapPublicBatch } from "@/app/api/_lib/mapPublicBatch";
import {
  escapeRegex,
} from "@/app/api/_lib/phase12";

function toPositiveInt(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** GET /api/public/batches — active batches open for public enrollment listing. */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = toPositiveInt(searchParams.get("page"), 1);
    const limit = Math.min(toPositiveInt(searchParams.get("limit"), 12), 100);
    const search = (searchParams.get("search") || "").trim();
    const courseId = (searchParams.get("courseId") || "").trim();
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { isActive: true };

    if (courseId) {
      if (!mongoose.Types.ObjectId.isValid(courseId)) {
        return NextResponse.json(
          { success: false, error: "Invalid courseId" },
          { status: 400 },
        );
      }
      filter.courseId = new mongoose.Types.ObjectId(courseId);
    }

    if (search) {
      filter.$or = [
        { name: { $regex: escapeRegex(search), $options: "i" } },
        { subject: { $regex: escapeRegex(search), $options: "i" } },
        { shortDescription: { $regex: escapeRegex(search), $options: "i" } },
        { description: { $regex: escapeRegex(search), $options: "i" } },
      ];
    }

    const [batches, total] = await Promise.all([
      Batch.find(filter)
        .populate("instructorId", INSTRUCTOR_USER_SELECT)
        .sort({ startDate: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Batch.countDocuments(filter),
    ]);

    const batchIds = batches.map((b) => b._id);
    const countRows =
      batchIds.length === 0
        ? []
        : await BatchEnrollment.aggregate([
            {
              $match: {
                batchId: { $in: batchIds },
                status: "active",
                paymentStatus: "paid",
              },
            },
            { $group: { _id: "$batchId", count: { $sum: 1 } } },
          ]);

    const countMap = new Map(
      countRows.map((r) => [String(r._id), Number(r.count) || 0]),
    );

    const courseIds = [
      ...new Set(
        batches
          .map((b) => (b.courseId ? String(b.courseId) : null))
          .filter(Boolean) as string[],
      ),
    ];
    const courses =
      courseIds.length > 0
        ? await Course.find({ _id: { $in: courseIds } })
            .select("_id isPaid price salePrice")
            .lean()
        : [];
    const courseMap = new Map(
      courses.map((c) => [
        String(c._id),
        {
          isPaid: Boolean(c.isPaid),
          price: Number(c.price) || 0,
          salePrice: Number(c.salePrice) || 0,
        },
      ]),
    );

    const data = batches.map((row) =>
      mapPublicBatch(
        row as Record<string, unknown>,
        countMap.get(String(row._id)) ?? 0,
        row.courseId ? courseMap.get(String(row.courseId)) : null,
      ),
    );

    return NextResponse.json({
      success: true,
      data: {
        batches: data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.max(1, Math.ceil(total / limit)),
        },
      },
    });
  } catch (error) {
    console.error("GET /api/public/batches", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch batches" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Course from "@/models/Course";
import User from "@/models/User";
import {
  applyCourseCatalogFilters,
  buildPublicCatalogBaseFilter,
  normalizeCatalogFilterParam,
} from "@/app/api/_lib/courseFilters";

/** Public catalog instructors with counts scoped by other active filters. */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const courseType = normalizeCatalogFilterParam(searchParams.get("courseType"));
    const grade = normalizeCatalogFilterParam(searchParams.get("grade"));
    const subjectId = normalizeCatalogFilterParam(searchParams.get("subjectId"));

    const baseFilter = buildPublicCatalogBaseFilter(courseType);
    const queryFilter = await applyCourseCatalogFilters(baseFilter, {
      grade,
      subjectId,
      instructorId: null,
    });

    const instructorRows = await Course.aggregate([
      {
        $match: {
          ...queryFilter,
          instructor: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: "$instructor",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const instructorIds = instructorRows
      .map((row) => row._id)
      .filter((id) => id != null);

    const users = await User.find({
      _id: { $in: instructorIds },
      role: "instructor",
    })
      .select("name")
      .lean();

    const userById = new Map(users.map((user) => [String(user._id), user]));

    const data = instructorRows
      .map((row) => {
        const id = String(row._id);
        const user = userById.get(id);
        if (!user) return null;

        const fullName = String(user.name || "").trim() || "Instructor";

        return {
          id,
          _id: id,
          label: fullName,
          name: fullName,
          count: Number(row.count) || 0,
        };
      })
      .filter(Boolean)
      .sort((a, b) =>
        String(a!.label).localeCompare(String(b!.label), undefined, {
          sensitivity: "base",
        }),
      );

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Public instructors error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch instructors" },
      { status: 500 },
    );
  }
}

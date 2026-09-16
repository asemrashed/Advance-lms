import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Subject from "@/models/Subject";
import Course from "@/models/Course";
import {
  applyCourseCatalogFilters,
  buildPublicCatalogBaseFilter,
  normalizeCatalogFilterParam,
} from "@/app/api/_lib/courseFilters";

/** Public catalog subjects with counts scoped by other active filters. */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const courseType = normalizeCatalogFilterParam(searchParams.get("courseType"));
    const grade = normalizeCatalogFilterParam(searchParams.get("grade"));
    const instructorId = normalizeCatalogFilterParam(
      searchParams.get("instructorId"),
    );

    const subjects = await Subject.find({ isActive: { $ne: false } })
      .sort({ name: 1 })
      .lean();

    const baseFilter = buildPublicCatalogBaseFilter(courseType);

    const data = await Promise.all(
      subjects.map(async (subject) => {
        const id = String(subject._id);
        const code = String(subject.code || "");
        const name = String(subject.name || "");
        const scopedFilter = await applyCourseCatalogFilters(baseFilter, {
          grade,
          instructorId,
          subjectId: id,
        });
        const count = await Course.countDocuments(scopedFilter);
        return {
          id,
          _id: id,
          label: name,
          name,
          code,
          count,
        };
      }),
    );

    const visible = data.filter((row) => row.count > 0);

    return NextResponse.json({ success: true, data: visible });
  } catch (error) {
    console.error("Public subjects error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch subjects" },
      { status: 500 },
    );
  }
}

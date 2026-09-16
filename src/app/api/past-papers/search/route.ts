import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import PastPaper from "@/models/PastPaper";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { parseLimit, parsePage } from "@/app/api/_lib/phase12";
import type { AppRole } from "@/app/api/_lib/phase12";
import {
  applyPastPaperListScope,
  buildPastPaperFilterQuery,
  buildPastPaperSort,
} from "@/app/api/_lib/pastPapers";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const role = session?.user?.role as AppRole | undefined;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parsePage(searchParams);
    const limit = parseLimit(searchParams);
    const query = buildPastPaperFilterQuery(searchParams, {
      includeYearRange: true,
    });
    await applyPastPaperListScope(query, role, userId);
    const sort = buildPastPaperSort(searchParams);
    const skip = (page - 1) * limit;

    const [pastPapers, total, subjects, examTypes, years] = await Promise.all([
      PastPaper.find(query)
        .populate("course", "title")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      PastPaper.countDocuments(query),
      PastPaper.distinct("subject", query),
      PastPaper.distinct("examType", query),
      PastPaper.distinct("year", query),
    ]);

    years.sort((a: number, b: number) => b - a);

    return NextResponse.json({
      pastPapers,
      pagination: {
        page,
        limit,
        total,
        pages: limit > 0 ? Math.ceil(total / limit) : 0,
      },
      suggestions: {
        subjects: subjects.slice(0, 10),
        examTypes: examTypes.slice(0, 10),
        years: years.slice(0, 10),
      },
    });
  } catch (error) {
    console.error("Search past papers error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

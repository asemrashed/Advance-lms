import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import PastPaper from "@/models/PastPaper";
import { requireSessionUser } from "@/app/api/_lib/phase12";
import type { PastPaperStats } from "@/types/past-paper";

export async function GET() {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;

    await connectDB();

    const [totalPapers, activePapers, inactivePapers] = await Promise.all([
      PastPaper.countDocuments(),
      PastPaper.countDocuments({ isActive: true }),
      PastPaper.countDocuments({ isActive: false }),
    ]);

    const [questionPapers, marksPdfs, workSolutions] = await Promise.all([
      PastPaper.countDocuments({
        questionPaperUrl: { $exists: true, $ne: "" },
      }),
      PastPaper.countDocuments({
        marksPdfUrl: { $exists: true, $ne: "" },
      }),
      PastPaper.countDocuments({
        workSolutionUrl: { $exists: true, $ne: "" },
      }),
    ]);

    const papersBySubject = await PastPaper.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$subject", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    const papersByYear = await PastPaper.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$year", count: { $sum: 1 } } },
      { $sort: { _id: -1 } },
      { $limit: 10 },
    ]);

    const recentUploads = await PastPaper.find({ isActive: true })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("sessionName year subject examType createdAt")
      .lean();

    const papersBySubjectObj = papersBySubject.reduce(
      (acc: Record<string, number>, item: { _id: string; count: number }) => {
        acc[item._id] = item.count;
        return acc;
      },
      {},
    );

    const papersByYearObj = papersByYear.reduce(
      (acc: Record<number, number>, item: { _id: number; count: number }) => {
        acc[item._id] = item.count;
        return acc;
      },
      {},
    );

    const stats: PastPaperStats = {
      totalPapers,
      activePapers,
      inactivePapers,
      papersByType: {
        questionPapers,
        marksPdfs,
        workSolutions,
      },
      papersBySubject: papersBySubjectObj,
      papersByYear: papersByYearObj,
      recentUploads: recentUploads as PastPaperStats["recentUploads"],
    };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Get past paper stats error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

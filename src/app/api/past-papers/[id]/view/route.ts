import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import {
  assertPublicPastPaperFileAccess,
  parsePastPaperFileType,
} from "@/app/api/_lib/pastPapers";
import { resolveResourcePdfUrl } from "@/app/api/_lib/resolveResourcePdfUrl";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const fileType =
      parsePastPaperFileType(searchParams.get("type")) ?? "question_paper";

    const access = await assertPublicPastPaperFileAccess(id, fileType);
    if (access.error) {
      return NextResponse.json(
        { success: false, error: access.error },
        { status: access.status ?? 403 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        url: resolveResourcePdfUrl(access.url!, request),
      },
    });
  } catch (error) {
    console.error("Past paper view error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

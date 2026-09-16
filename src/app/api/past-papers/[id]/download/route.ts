import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import {
  assertPublicPastPaperFileAccess,
  parsePastPaperFileType,
} from "@/app/api/_lib/pastPapers";
import { resolveServingPdfUrl } from "@/app/api/_lib/resolveResourcePdfUrl";
import { toPublicAbsoluteUrl } from "@/app/api/_lib/publicAbsoluteUrl";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await connectDB();
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const fileType = parsePastPaperFileType(searchParams.get("type"));

    if (!fileType) {
      return NextResponse.json(
        {
          error:
            "Invalid type. Use question_paper, marks_pdf, or work_solution",
        },
        { status: 400 },
      );
    }

    const access = await assertPublicPastPaperFileAccess(id, fileType);
    if (access.error) {
      return NextResponse.json(
        { error: access.error },
        { status: access.status ?? 403 },
      );
    }

    const servingPath = await resolveServingPdfUrl(access.url!, null, request);
    return NextResponse.redirect(toPublicAbsoluteUrl(servingPath, request), 302);
  } catch (error) {
    console.error("Past paper download error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

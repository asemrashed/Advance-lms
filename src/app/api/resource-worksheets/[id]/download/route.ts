import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import connectDB from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import { assertResourceWorksheetDownload, parseResourceWorksheetFileType } from "@/app/api/_lib/resourceWorksheets";
import { resolveServingPdfUrl } from "@/app/api/_lib/resolveResourcePdfUrl";
import { toPublicAbsoluteUrl } from "@/app/api/_lib/publicAbsoluteUrl";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    await connectDB();
    const { id } = await params;
    const fileType = parseResourceWorksheetFileType(
      new URL(request.url).searchParams.get("type"),
    );

    const access = await assertResourceWorksheetDownload(
      id,
      session?.user?.id,
      session?.user?.role,
      fileType,
    );

    if (access.error) {
      const status = access.status ?? 403;
      if (status === 403 && !session?.user?.id) {
        return NextResponse.json(
          { success: false, error: "Sign in to download this worksheet" },
          { status: 401 },
        );
      }
      return NextResponse.json(
        { success: false, error: access.error },
        { status },
      );
    }

    const servingPath = await resolveServingPdfUrl(
      access.url!,
      access.pdfPublicId,
      request,
    );
    return NextResponse.redirect(toPublicAbsoluteUrl(servingPath, request), 302);
  } catch (error) {
    console.error("Resource worksheet download error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

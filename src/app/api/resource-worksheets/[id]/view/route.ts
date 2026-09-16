import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import connectDB from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import { assertResourceWorksheetDownload, parseResourceWorksheetFileType } from "@/app/api/_lib/resourceWorksheets";
import { resolveServingPdfUrl } from "@/app/api/_lib/resolveResourcePdfUrl";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    const role = session?.user?.role;

    await connectDB();
    const { id } = await params;
    const fileType = parseResourceWorksheetFileType(
      new URL(request.url).searchParams.get("type"),
    );

    const access = await assertResourceWorksheetDownload(id, userId, role, fileType);
    if (access.error) {
      const status = access.status ?? 403;
      if (status === 403 && !userId) {
        return NextResponse.json(
          { success: false, error: "Sign in to read this worksheet" },
          { status: 401 },
        );
      }
      return NextResponse.json(
        { success: false, error: access.error },
        { status },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        url: await resolveServingPdfUrl(
          access.url!,
          access.pdfPublicId,
          request,
        ),
      },
    });
  } catch (error) {
    console.error("Resource worksheet view error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

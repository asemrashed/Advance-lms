import { NextRequest, NextResponse } from "next/server";
import { requireSessionUser } from "@/app/api/_lib/phase12";
import {
  createAccessRequest,
  getInstructorAccessSummary,
  listAccessRequests,
} from "@/app/api/_lib/platformQuestionAccess";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const { requests, pagination } = await listAccessRequests(auth.user, searchParams);

    const data: Record<string, unknown> = { requests, pagination };
    if (auth.user.role === "instructor") {
      data.summary = await getInstructorAccessSummary(auth.user.id);
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Platform access-requests GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch access requests" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSessionUser(["instructor"]);
    if (auth.error) return auth.error;

    const body = (await request.json()) as Record<string, unknown>;
    const result = await createAccessRequest(auth.user, body);
    if ("error" in result) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status },
      );
    }

    return NextResponse.json({ success: true, data: result.doc }, { status: 201 });
  } catch (error) {
    console.error("Platform access-requests POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create access request" },
      { status: 500 },
    );
  }
}

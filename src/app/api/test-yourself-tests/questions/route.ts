import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import connectDB from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import {
  publishQuestionsToTest,
  removeQuestionsFromTest,
} from "@/app/api/_lib/testYourselfTests";
import { requireAdminPlatformResources } from "@/app/api/_lib/resourceStaffAccess";
import type { SessionUser } from "@/app/api/_lib/phase12";

function toSessionUser(session: {
  user?: { id?: string; role?: string } | null;
}): SessionUser | null {
  if (!session?.user?.id || !session.user.role) return null;
  return {
    id: session.user.id,
    role: session.user.role as SessionUser["role"],
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = toSessionUser(session ?? {});
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const adminGate = requireAdminPlatformResources(user);
    if (adminGate.error) return adminGate.error;

    await connectDB();
    const body = (await request.json()) as {
      questionIds?: string[];
      subject?: string;
      topic?: string;
      action?: "add" | "remove";
    };

    const questionIds = Array.isArray(body.questionIds) ? body.questionIds : [];
    const action = body.action === "remove" ? "remove" : "add";

    if (!questionIds.length) {
      return NextResponse.json(
        { success: false, error: "No questions selected" },
        { status: 400 },
      );
    }

    if (action === "remove") {
      const updated = await removeQuestionsFromTest(questionIds);
      return NextResponse.json({ success: true, data: { updated } });
    }

    const subject = String(body.subject ?? "").trim();
    const topic = String(body.topic ?? "").trim();
    const result = await publishQuestionsToTest(
      questionIds,
      subject,
      topic,
      session?.user?.id,
    );

    if (result.error) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: { updated: result.updated },
    });
  } catch (error) {
    console.error("Bulk test-yourself questions error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

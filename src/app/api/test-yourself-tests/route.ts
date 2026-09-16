import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import connectDB from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import {
  ensureTestYourselfTest,
  listStaffTestYourselfTests,
  mapTestYourselfTest,
} from "@/app/api/_lib/testYourselfTests";
import { formatTestYourselfName, TEST_YOURSELF_COURSE_TOPIC } from "@/lib/resources/testYourselfTestName";
import { requireAdminPlatformResources } from "@/app/api/_lib/resourceStaffAccess";
import { resolveResourceSubject } from "@/app/api/_lib/resourceSubject";
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

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = toSessionUser(session ?? {});
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const adminGate = requireAdminPlatformResources(user);
    if (adminGate.error) return adminGate.error;

    await connectDB();
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();
    const subject = searchParams.get("subject")?.trim();
    const grade = searchParams.get("grade")?.trim();

    const tests = await listStaffTestYourselfTests({ search, subject, grade });

    return NextResponse.json({
      success: true,
      data: { tests },
    });
  } catch (error) {
    console.error("List test-yourself tests error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
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
    const body = (await request.json()) as Record<string, unknown>;
    const topic = String(body.topic ?? "").trim() || TEST_YOURSELF_COURSE_TOPIC;
    const resolved = await resolveResourceSubject(body, { requireChapter: false });
    if (resolved.error || !resolved.value) {
      return NextResponse.json(
        { success: false, error: resolved.error || "Subject is required" },
        { status: 400 },
      );
    }

    const freeQuestionLimit = body.freeQuestionLimit != null
      ? Number(body.freeQuestionLimit)
      : 5;
    const enrolledQuestionLimit = body.enrolledQuestionLimit != null
      ? Number(body.enrolledQuestionLimit)
      : 12;

    const test = await ensureTestYourselfTest(resolved.value.subject, topic, {
      userId: session?.user?.id,
      freeQuestionLimit: Number.isFinite(freeQuestionLimit) ? freeQuestionLimit : 5,
      enrolledQuestionLimit: Number.isFinite(enrolledQuestionLimit)
        ? enrolledQuestionLimit
        : 12,
      isPublished: body.isPublished !== false,
    });

    if (Number.isFinite(freeQuestionLimit) && freeQuestionLimit >= 1) {
      test.freeQuestionLimit = freeQuestionLimit;
    }
    if (Number.isFinite(enrolledQuestionLimit) && enrolledQuestionLimit >= 1) {
      test.enrolledQuestionLimit = enrolledQuestionLimit;
    }

    if (body.name && String(body.name).trim()) {
      test.name = String(body.name).trim();
    } else {
      test.name = formatTestYourselfName(topic, resolved.value.subject);
    }
    if (resolved.value.grade) {
      test.grade = resolved.value.grade;
    }
    await test.save();

    return NextResponse.json({
      success: true,
      data: { test: mapTestYourselfTest(test, 0) },
    });
  } catch (error) {
    console.error("Create test-yourself test error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

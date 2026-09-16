import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import connectDB from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import {
  countPublishedQuestions,
  getTestYourselfTestById,
  listTestQuestions,
  mapTestYourselfTest,
  unpublishTestQuestions,
} from "@/app/api/_lib/testYourselfTests";
import TestYourselfTest from "@/models/TestYourselfTest";
import { isObjectId } from "@/app/api/_lib/phase12";
import { formatTestYourselfName } from "@/lib/resources/testYourselfTestName";
import { mapTestYourselfQuestion } from "@/app/api/_lib/testYourself";
import { requireAdminPlatformResources } from "@/app/api/_lib/resourceStaffAccess";
import type { SessionUser } from "@/app/api/_lib/phase12";

interface RouteParams {
  params: Promise<{ id: string }>;
}

function toSessionUser(session: {
  user?: { id?: string; role?: string } | null;
}): SessionUser | null {
  if (!session?.user?.id || !session.user.role) return null;
  return {
    id: session.user.id,
    role: session.user.role as SessionUser["role"],
  };
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    const user = toSessionUser(session ?? {});
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const adminGate = requireAdminPlatformResources(user);
    if (adminGate.error) return adminGate.error;

    await connectDB();
    const { id } = await params;
    const test = await getTestYourselfTestById(id);
    if (!test) {
      return NextResponse.json({ success: false, error: "Test not found" }, { status: 404 });
    }

    const rows = await listTestQuestions(test.subject, test.topic);
    const questions = rows.map((r) => mapTestYourselfQuestion(r as Record<string, unknown>));

    return NextResponse.json({
      success: true,
      data: { test, questions },
    });
  } catch (error) {
    console.error("Get test-yourself test error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    const user = toSessionUser(session ?? {});
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const adminGate = requireAdminPlatformResources(user);
    if (adminGate.error) return adminGate.error;

    await connectDB();
    const { id } = await params;
    if (!isObjectId(id)) {
      return NextResponse.json({ success: false, error: "Invalid test ID" }, { status: 400 });
    }

    const test = await TestYourselfTest.findById(id);
    if (!test) {
      return NextResponse.json({ success: false, error: "Test not found" }, { status: 404 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.subject === "string" && body.subject.trim()) {
      test.subject = body.subject.trim();
    }
    if (typeof body.topic === "string" && body.topic.trim()) {
      test.topic = body.topic.trim();
    }
    if (typeof body.name === "string" && body.name.trim()) {
      test.name = body.name.trim();
    } else if (body.subject || body.topic) {
      test.name = formatTestYourselfName(test.topic, test.subject);
    }
    if (body.freeQuestionLimit != null) {
      const limit = Number(body.freeQuestionLimit);
      if (Number.isFinite(limit) && limit >= 1 && limit <= 100) {
        test.freeQuestionLimit = limit;
      }
    }
    if (body.enrolledQuestionLimit != null) {
      const limit = Number(body.enrolledQuestionLimit);
      if (Number.isFinite(limit) && limit >= 1 && limit <= 200) {
        test.enrolledQuestionLimit = limit;
      }
    }
    if (typeof body.isPublished === "boolean") test.isPublished = body.isPublished;
    if (typeof body.isActive === "boolean") test.isActive = body.isActive;
    if (body.courseId === null) {
      test.courseId = undefined;
    } else if (body.courseId && isObjectId(String(body.courseId))) {
      test.courseId = body.courseId as never;
    }

    await test.save();
    const count = await countPublishedQuestions(test.subject, test.topic);

    return NextResponse.json({
      success: true,
      data: { test: mapTestYourselfTest(test, count) },
    });
  } catch (error) {
    console.error("Update test-yourself test error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    const user = toSessionUser(session ?? {});
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    const adminGate = requireAdminPlatformResources(user);
    if (adminGate.error) return adminGate.error;

    await connectDB();
    const { id } = await params;
    if (!isObjectId(id)) {
      return NextResponse.json({ success: false, error: "Invalid test ID" }, { status: 400 });
    }

    const test = await TestYourselfTest.findById(id);
    if (!test) {
      return NextResponse.json({ success: false, error: "Test not found" }, { status: 404 });
    }

    await unpublishTestQuestions(test.subject, test.topic);
    test.isActive = false;
    test.isPublished = false;
    await test.save();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete test-yourself test error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

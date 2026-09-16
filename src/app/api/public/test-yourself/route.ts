import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import connectDB from "@/lib/mongodb";
import { authOptions } from "@/lib/auth";
import { resolveResourceCenterAccess } from "@/app/api/_lib/resourceAccess";
import {
  listTestYourselfSubjects,
  resolveTestYourselfAccess,
} from "@/app/api/_lib/testYourself";

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const session = await getServerSession(authOptions);
    const centerAccess = await resolveResourceCenterAccess(
      session?.user?.id,
      session?.user?.role,
    );
    const access = await resolveTestYourselfAccess(
      session?.user?.id,
      session?.user?.role,
    );

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim().toLowerCase();
    const grade = searchParams.get("grade")?.trim();

    let subjects = await listTestYourselfSubjects(access, { grade });

    if (search) {
      subjects = subjects.filter(
        (s) =>
          s.subject.toLowerCase().includes(search) ||
          s.name.toLowerCase().includes(search) ||
          s.topics.some((t) => t.topic.toLowerCase().includes(search)),
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        subjects,
        subjectNames: subjects.map((s) => s.subject),
        // legacy flat topics for older clients
        topics: subjects.flatMap((s) =>
          s.topics.map((t) => ({
            subject: s.subject,
            topic: t.topic,
            name: t.name,
            questionCount: t.questionCount,
            previewCount: access.fullAccess
              ? t.questionCount
              : Math.min(t.questionCount, s.freeLimit),
            lockedCount: access.fullAccess
              ? 0
              : Math.max(0, t.questionCount - s.freeLimit),
            freeLimit: s.freeLimit,
            enrolledLimit: s.enrolledLimit,
            courseId: s.courseId,
          })),
        ),
        access: centerAccess,
      },
    });
  } catch (error) {
    console.error("Public test-yourself catalog error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 },
    );
  }
}

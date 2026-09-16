import { NextRequest, NextResponse } from "next/server";
import PlatformQuestion from "@/models/PlatformQuestion";
import { requireSessionUser } from "@/app/api/_lib/phase12";
import {
  listPlatformQuestions,
  parseCreatePlatformQuestionBody,
  serializePlatformQuestion,
  validatePlatformQuestionPayload,
  enrichPlatformQuestionWithComponent,
} from "@/app/api/_lib/platformQuestions";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;

    const { searchParams } = new URL(request.url);
    const { questions, pagination } = await listPlatformQuestions(
      auth.user,
      searchParams,
    );

    return NextResponse.json({
      success: true,
      data: { questions, pagination },
    });
  } catch (error) {
    console.error("Platform questions GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch platform questions" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;

    const body = (await request.json()) as Record<string, unknown>;
    const parsed = parseCreatePlatformQuestionBody(body, auth.user);
    const enriched = await enrichPlatformQuestionWithComponent(parsed);
    if ("error" in enriched) {
      return NextResponse.json({ success: false, error: enriched.error }, { status: 400 });
    }
    const payload = enriched.payload;
    const errors = validatePlatformQuestionPayload(payload);
    if (errors.length) {
      return NextResponse.json({ success: false, error: errors.join("; ") }, { status: 400 });
    }

    const doc = await PlatformQuestion.create({
      ...payload,
      options: payload.options.map((o: { text?: string; isCorrect?: boolean }) => ({
        text: String(o.text || "").trim(),
        isCorrect: Boolean(o.isCorrect),
      })),
    });

    return NextResponse.json(
      {
        success: true,
        data: serializePlatformQuestion(doc.toObject() as Record<string, unknown>),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Platform questions POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create platform question" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Exam from "@/models/Exam";
import Question from "@/models/Question";
import { isObjectId, instructorExamAccessMatch, requireSessionUser, toObjectId } from "@/app/api/_lib/phase12";

interface RouteCtx {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, ctx: RouteCtx) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;

    const { id } = await ctx.params;
    if (!isObjectId(id)) {
      return NextResponse.json({ success: false, error: "Invalid exam id" }, { status: 400 });
    }

    const examOid = toObjectId(id);
    let exam: unknown = null;
    if (auth.user.role === "instructor") {
      const scope = await instructorExamAccessMatch(auth.user.id);
      exam = await Exam.findOne({ $and: [{ _id: examOid }, scope] }).lean();
    } else {
      exam = await Exam.findOne({ _id: examOid }).lean();
    }
    if (!exam) {
      return NextResponse.json({ success: false, error: "Exam not found" }, { status: 404 });
    }

    const questions = await Question.find({ exam: new mongoose.Types.ObjectId(id) })
      .sort({ createdAt: 1 })
      .lean();
    return NextResponse.json({ success: true, data: { questions } });
  } catch (error) {
    console.error("Exam questions GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch exam questions" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest, ctx: RouteCtx) {
  try {
    const auth = await requireSessionUser(["admin", "instructor"]);
    if (auth.error) return auth.error;

    const { id } = await ctx.params;
    if (!isObjectId(id)) {
      return NextResponse.json({ success: false, error: "Invalid exam id" }, { status: 400 });
    }

    const examOid = toObjectId(id);
    let exam: unknown = null;
    if (auth.user.role === "instructor") {
      const scope = await instructorExamAccessMatch(auth.user.id);
      exam = await Exam.findOne({ $and: [{ _id: examOid }, scope] }).lean();
    } else {
      exam = await Exam.findOne({ _id: examOid }).lean();
    }
    if (!exam) {
      return NextResponse.json({ success: false, error: "Exam not found" }, { status: 404 });
    }

    const body = (await request.json()) as { questionIds?: string[] };
    const questionIds = Array.isArray(body.questionIds) ? body.questionIds : [];
    const validIds = questionIds.filter((x) => isObjectId(x));
    await Exam.findByIdAndUpdate(id, { $set: { questions: validIds } });
    await Question.updateMany(
      { _id: { $in: validIds.map((x) => new mongoose.Types.ObjectId(x)) } },
      { $set: { exam: new mongoose.Types.ObjectId(id) } },
    );
    return NextResponse.json({ success: true, data: { questionIds: validIds } });
  } catch (error) {
    console.error("Exam questions POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update exam questions" },
      { status: 500 },
    );
  }
}

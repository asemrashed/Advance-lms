import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import Question from "@/models/Question";
import Exam from "@/models/Exam";
import { requireSessionUser, isObjectId } from "@/app/api/_lib/phase12";

export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireSessionUser(["admin"]);
    if (auth.error) return auth.error;

    const body = (await request.json()) as {
      ids?: string[];
      action?: "delete" | "activate" | "deactivate";
    };
    const ids = Array.isArray(body.ids) ? body.ids.filter(isObjectId) : [];
    const action = body.action;

    if (!ids.length || !action) {
      return NextResponse.json({ success: false, error: "ids and action are required" }, { status: 400 });
    }

    const objectIds = ids.map((id) => new mongoose.Types.ObjectId(id));

    if (action === "delete") {
      const toDelete = await Question.find({ _id: { $in: objectIds } }).lean();
      await Question.deleteMany({ _id: { $in: objectIds } });
      for (const q of toDelete) {
        if (q.exam) {
          await Exam.findByIdAndUpdate(q.exam, { $pull: { questions: q._id } });
        }
      }
      return NextResponse.json({ success: true, data: { affected: ids.length } });
    }

    if (action === "activate" || action === "deactivate") {
      const result = await Question.updateMany(
        { _id: { $in: objectIds } },
        { $set: { isActive: action === "activate" } },
      );
      return NextResponse.json({ success: true, data: { affected: result.modifiedCount } });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Admin question-bank bulk PATCH error:", error);
    return NextResponse.json({ success: false, error: "Bulk action failed" }, { status: 500 });
  }
}

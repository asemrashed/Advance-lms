import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import CourseFAQ from "@/models/CourseFAQ";
import { requireSessionUser, type SessionUser } from "@/app/api/_lib/phase12";
import {
  assertCanManageCourseFaqs,
  assertCanManageFaqById,
} from "@/app/api/admin/faqs/_access";

type RouteCtx = { params: Promise<{ id: string }> };

async function updateFaq(request: NextRequest, id: string, user: SessionUser) {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ success: false, error: "Invalid FAQ ID" }, { status: 400 });
  }

  const access = await assertCanManageFaqById(user, id);
  if ("error" in access) return access.error;

  const body = await request.json();
  const updates: Record<string, unknown> = {};
  if (body.question !== undefined) updates.question = String(body.question).trim();
  if (body.answer !== undefined) updates.answer = String(body.answer).trim();
  if (typeof body.order === "number" && body.order >= 0) updates.order = body.order;
  if (body.course !== undefined) {
    const denied = await assertCanManageCourseFaqs(user, String(body.course));
    if (denied) return denied;
    updates.course = body.course;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { success: false, error: "No valid fields to update" },
      { status: 400 },
    );
  }

  const faq = await CourseFAQ.findByIdAndUpdate(
    id,
    { $set: updates },
    { new: true, runValidators: true },
  )
    .populate("course", "title")
    .lean();

  if (!faq) {
    return NextResponse.json({ success: false, error: "FAQ not found" }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: faq,
    message: "FAQ updated successfully",
  });
}

export async function GET(_request: NextRequest, ctx: RouteCtx) {
  const auth = await requireSessionUser(["admin", "instructor"]);
  if (auth.error) return auth.error;

  try {
    const { id } = await ctx.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid FAQ ID" }, { status: 400 });
    }

    const access = await assertCanManageFaqById(auth.user, id);
    if ("error" in access) return access.error;

    const faq = await CourseFAQ.findById(id).populate("course", "title").lean();
    if (!faq) {
      return NextResponse.json({ success: false, error: "FAQ not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: faq });
  } catch (error) {
    console.error("[admin/faqs/[id]] GET", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch FAQ" },
      { status: 500 },
    );
  }
}

/** Frontend FAQ editor uses PATCH; PUT kept for contract compatibility. */
export async function PATCH(request: NextRequest, ctx: RouteCtx) {
  const auth = await requireSessionUser(["admin", "instructor"]);
  if (auth.error) return auth.error;

  try {
    const { id } = await ctx.params;
    return await updateFaq(request, id, auth.user);
  } catch (error) {
    console.error("[admin/faqs/[id]] PATCH", error);
    return NextResponse.json(
      { success: false, error: "Failed to update FAQ" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest, ctx: RouteCtx) {
  const auth = await requireSessionUser(["admin", "instructor"]);
  if (auth.error) return auth.error;

  try {
    const { id } = await ctx.params;
    return await updateFaq(request, id, auth.user);
  } catch (error) {
    console.error("[admin/faqs/[id]] PUT", error);
    return NextResponse.json(
      { success: false, error: "Failed to update FAQ" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, ctx: RouteCtx) {
  const auth = await requireSessionUser(["admin", "instructor"]);
  if (auth.error) return auth.error;

  try {
    const { id } = await ctx.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: "Invalid FAQ ID" }, { status: 400 });
    }

    const access = await assertCanManageFaqById(auth.user, id);
    if ("error" in access) return access.error;

    const faq = await CourseFAQ.findByIdAndDelete(id);
    if (!faq) {
      return NextResponse.json({ success: false, error: "FAQ not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "FAQ deleted successfully",
    });
  } catch (error) {
    console.error("[admin/faqs/[id]] DELETE", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete FAQ" },
      { status: 500 },
    );
  }
}

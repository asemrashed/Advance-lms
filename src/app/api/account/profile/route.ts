import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireSessionUser } from "@/app/api/_lib/phase12";
import User from "@/models/User";
import { mergeBankDetailsUpdate } from "@/lib/bankDetails";

const PUT_STRING_FIELDS = [
  "name",
  "avatar",
  "bio",
  "address",
  "parentPhone",
  "education",
  "specialization",
  "experience",
] as const;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function stripPassword<T extends Record<string, unknown>>(doc: T) {
  const { password: _p, __v, ...rest } = doc as T & { password?: unknown; __v?: unknown };
  return rest;
}

export async function GET() {
  const auth = await requireSessionUser();
  if (auth.error) return auth.error;

  try {
    const userId = auth.user!.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ success: false, error: "Invalid session" }, { status: 400 });
    }

    const doc = await User.findById(userId).lean();
    if (!doc) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: stripPassword(doc as Record<string, unknown>) });
  } catch (e) {
    console.error("[account/profile] GET", e);
    return NextResponse.json({ success: false, error: "Failed to load profile" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const auth = await requireSessionUser();
  if (auth.error) return auth.error;

  try {
    const userId = auth.user!.id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ success: false, error: "Invalid session" }, { status: 400 });
    }

    const existing = await User.findById(userId).lean();
    if (!existing) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    if (!isPlainObject(body)) {
      return NextResponse.json({ success: false, error: "Invalid body" }, { status: 400 });
    }

    const $set: Record<string, unknown> = {};
    const $unset: Record<string, 1> = {};

    for (const key of PUT_STRING_FIELDS) {
      if (!Object.prototype.hasOwnProperty.call(body, key)) continue;
      const raw = body[key];
      if (raw === null) {
        if (key === "name") {
          return NextResponse.json(
            { success: false, error: `${key} cannot be null` },
            { status: 400 },
          );
        }
        if (key === "avatar") {
          $set.avatar = "";
        } else {
          $unset[key] = 1;
        }
        continue;
      }
      if (typeof raw !== "string") {
        return NextResponse.json(
          { success: false, error: `Field ${key} must be a string` },
          { status: 400 },
        );
      }
      const trimmed = raw.trim();
      if (key === "name") {
        if (!trimmed) {
          return NextResponse.json({ success: false, error: "Name cannot be empty" }, { status: 400 });
        }
        $set.name = trimmed;
        continue;
      }
      if (key === "avatar") {
        $set.avatar = trimmed;
        continue;
      }
      if (trimmed === "") {
        $unset[key] = 1;
      } else {
        $set[key] = trimmed;
      }
    }

    if ("socialLinks" in body) {
      const sl = body.socialLinks;
      if (sl === null) {
        $unset.socialLinks = 1;
      } else if (!isPlainObject(sl)) {
        return NextResponse.json({ success: false, error: "socialLinks must be an object" }, { status: 400 });
      } else {
        const prev = isPlainObject(existing.socialLinks)
          ? { ...(existing.socialLinks as Record<string, unknown>) }
          : {};
        const next: Record<string, string> = {};
        for (const k of ["linkedin", "twitter", "website"] as const) {
          if (!(k in sl)) continue;
          const v = sl[k];
          if (v === null || v === undefined || v === "") continue;
          if (typeof v !== "string") {
            return NextResponse.json(
              { success: false, error: `socialLinks.${k} must be a string` },
              { status: 400 },
            );
          }
          next[k] = v.trim();
        }
        if (Object.keys(next).length === 0 && Object.keys(prev).length === 0) {
          // nothing to set
        } else {
          $set.socialLinks = { ...prev, ...next };
        }
      }
    }

    if ("bankDetails" in body) {
      try {
        const merged = mergeBankDetailsUpdate(existing.bankDetails, body.bankDetails);
        if (merged === null) {
          $unset.bankDetails = 1;
        } else {
          $set.bankDetails = merged;
        }
      } catch (err) {
        return NextResponse.json(
          {
            success: false,
            error: err instanceof Error ? err.message : "Invalid bankDetails",
          },
          { status: 400 },
        );
      }
    }

    const hasUpdates = Object.keys($set).length > 0 || Object.keys($unset).length > 0;
    if (!hasUpdates) {
      return NextResponse.json(
        { success: false, error: "No allowed fields to update" },
        { status: 400 },
      );
    }

    const updatePayload: Record<string, unknown> = {};
    if (Object.keys($set).length) updatePayload.$set = $set;
    if (Object.keys($unset).length) updatePayload.$unset = $unset;

    const updated = await User.findByIdAndUpdate(userId, updatePayload, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updated) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: stripPassword(updated as Record<string, unknown>) });
  } catch (e) {
    console.error("[account/profile] PUT", e);
    return NextResponse.json({ success: false, error: "Failed to update profile" }, { status: 500 });
  }
}

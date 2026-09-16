import mongoose from "mongoose";
import User from "@/models/User";
import { isObjectId, toObjectId } from "@/app/api/_lib/phase12";
import type { SessionUser } from "@/app/api/_lib/phase12";

export function resolveBatchInstructorIds(
  batch: { instructorIds?: unknown[]; instructorId?: unknown },
): string[] {
  const fromArray = Array.isArray(batch.instructorIds)
    ? batch.instructorIds.map((id) => String(id)).filter(Boolean)
    : [];
  if (fromArray.length > 0) return fromArray;
  if (batch.instructorId) return [String(batch.instructorId)];
  return [];
}

export function batchHasInstructor(
  batch: { instructorIds?: unknown[]; instructorId?: unknown },
  userId: string,
) {
  return resolveBatchInstructorIds(batch).some((id) => id === String(userId));
}

/**
 * Parse instructorIds / instructorId from a request body.
 * - Admin: any valid instructors (or empty).
 * - Instructor: always self only (cannot assign other instructors).
 */
export async function parseInstructorIdsInput(
  body: Record<string, unknown>,
  user: SessionUser,
): Promise<{ ids: mongoose.Types.ObjectId[]; error?: string }> {
  if (user.role === "instructor") {
    return { ids: [toObjectId(user.id)] };
  }

  const rawList = Array.isArray(body.instructorIds) ? body.instructorIds : [];
  const single = body.instructorId;

  let idStrings: string[] = rawList
    .map((v) => (typeof v === "string" || typeof v === "number" ? String(v) : ""))
    .filter((v) => v.trim());

  if (idStrings.length === 0 && isObjectId(single)) {
    idStrings = [String(single)];
  }

  if (idStrings.length === 0) {
    return { ids: [] };
  }

  const unique = [...new Set(idStrings)];
  for (const id of unique) {
    if (!isObjectId(id)) {
      return { ids: [], error: "Invalid instructor id in instructorIds" };
    }
  }

  const instructors = await User.find({
    _id: { $in: unique.map((id) => toObjectId(id)) },
    role: "instructor",
  })
    .select("_id")
    .lean();

  if (instructors.length !== unique.length) {
    return { ids: [], error: "One or more instructors were not found" };
  }

  return { ids: unique.map((id) => toObjectId(id)) };
}

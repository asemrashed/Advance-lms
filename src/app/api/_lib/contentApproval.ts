import mongoose from "mongoose";
import ContentApprovalRequest from "@/models/ContentApprovalRequest";
import Course from "@/models/Course";

export async function hasApprovedCourseRequest(
  courseId: mongoose.Types.ObjectId | string,
) {
  const courseObjectId = new mongoose.Types.ObjectId(String(courseId));
  const approved = await ContentApprovalRequest.exists({
    type: "course",
    courseId: courseObjectId,
    status: "approved",
  });
  return Boolean(approved);
}

export async function upsertPendingContentRequest(input: {
  type: "course" | "batch";
  courseId: mongoose.Types.ObjectId | string;
  batchId?: mongoose.Types.ObjectId | string;
  requestedBy: mongoose.Types.ObjectId | string;
}) {
  const courseObjectId = new mongoose.Types.ObjectId(String(input.courseId));
  const requestedByObjectId = new mongoose.Types.ObjectId(String(input.requestedBy));
  const batchObjectId = input.batchId
    ? new mongoose.Types.ObjectId(String(input.batchId))
    : undefined;

  const existing = await ContentApprovalRequest.findOne({
    type: input.type,
    courseId: courseObjectId,
    ...(batchObjectId ? { batchId: batchObjectId } : {}),
    status: "pending",
  });

  if (existing) return existing;

  return ContentApprovalRequest.create({
    type: input.type,
    status: "pending",
    courseId: courseObjectId,
    batchId: batchObjectId,
    requestedBy: requestedByObjectId,
  });
}

/**
 * Clear pending approval requests so a later admin approve cannot publish
 * a course that was switched back to draft (or otherwise withdrawn).
 */
export async function withdrawPendingContentRequests(input: {
  type: "course" | "batch";
  courseId: mongoose.Types.ObjectId | string;
  batchId?: mongoose.Types.ObjectId | string;
}) {
  const courseObjectId = new mongoose.Types.ObjectId(String(input.courseId));
  const batchObjectId = input.batchId
    ? new mongoose.Types.ObjectId(String(input.batchId))
    : undefined;

  await ContentApprovalRequest.updateMany(
    {
      type: input.type,
      courseId: courseObjectId,
      ...(batchObjectId ? { batchId: batchObjectId } : {}),
      status: "pending",
    },
    {
      $set: {
        status: "rejected",
        reviewedAt: new Date(),
        rejectionNote: "Withdrawn — course returned to draft",
      },
    },
  );
}

/**
 * Fix courses stuck as pending_approval after admin deleted/approved the request
 * without the course status being updated (or duplicate requests left orphans).
 */
export async function syncOrphanedPendingCourses() {
  const pendingCourses = await Course.find({ status: "pending_approval" })
    .select("_id")
    .lean();
  if (pendingCourses.length === 0) return;

  const courseIds = pendingCourses.map((c) => c._id);

  const [pendingReqs, approvedReqs] = await Promise.all([
    ContentApprovalRequest.find({
      type: "course",
      courseId: { $in: courseIds },
      status: "pending",
    })
      .select("courseId")
      .lean(),
    ContentApprovalRequest.find({
      type: "course",
      courseId: { $in: courseIds },
      status: "approved",
    })
      .select("courseId")
      .lean(),
  ]);

  const stillPending = new Set(pendingReqs.map((r) => String(r.courseId)));
  const wasApproved = new Set(approvedReqs.map((r) => String(r.courseId)));

  const toPublish: mongoose.Types.ObjectId[] = [];
  const toDraft: mongoose.Types.ObjectId[] = [];

  for (const course of pendingCourses) {
    const id = String(course._id);
    if (stillPending.has(id)) continue;
    if (wasApproved.has(id)) {
      toPublish.push(course._id as mongoose.Types.ObjectId);
    } else {
      toDraft.push(course._id as mongoose.Types.ObjectId);
    }
  }

  if (toPublish.length > 0) {
    await Course.updateMany(
      { _id: { $in: toPublish } },
      { $set: { status: "published" } },
    );
  }
  if (toDraft.length > 0) {
    await Course.updateMany(
      { _id: { $in: toDraft } },
      { $set: { status: "draft" } },
    );
  }
}

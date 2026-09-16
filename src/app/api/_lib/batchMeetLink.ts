import Batch from "@/models/Batch";
import LiveClass from "@/models/LiveClass";
import { normalizeMeetLink } from "@/lib/meetLink";
import { toObjectId } from "@/app/api/_lib/phase12";

/**
 * Copy the permanent batch Meet link onto live classes that do not have a
 * custom link, or that still use the previous batch link.
 */
export async function applyPermanentMeetLinkToBatchLiveClasses(
  batchId: string,
  meetLink: string,
  previousMeetLink?: string,
) {
  const next = normalizeMeetLink(meetLink);
  if (!next) return 0;

  const or: Record<string, unknown>[] = [
    { meetLink: { $exists: false } },
    { meetLink: "" },
    { meetLink: null },
  ];
  const prev = normalizeMeetLink(previousMeetLink);
  if (prev && prev !== next) or.push({ meetLink: prev });

  const result = await LiveClass.updateMany(
    { batchId: toObjectId(batchId), $or: or },
    { $set: { meetLink: next } },
  );
  return result.modifiedCount ?? 0;
}

/** First non-empty Meet link among a course's batches (the permanent course link). */
export async function resolveCourseMeetLink(courseId: string) {
  const batches = await Batch.find({ courseId })
    .select("meetLink")
    .lean();
  for (const batch of batches) {
    const link = normalizeMeetLink(batch.meetLink);
    if (link) return link;
  }
  return "";
}

/**
 * The course Meet link is permanent and shared. Copy it onto every batch and
 * every live class that does not have a custom link.
 */
export async function inheritPermanentMeetLinkForCourse(courseId: string) {
  const source = await resolveCourseMeetLink(courseId);
  if (!source) return { meetLink: "", updatedBatches: 0, updatedLiveClasses: 0 };

  const batchResult = await Batch.updateMany(
    {
      courseId,
      $or: [
        { meetLink: { $exists: false } },
        { meetLink: "" },
        { meetLink: null },
      ],
    },
    { $set: { meetLink: source } },
  );

  const batches = await Batch.find({ courseId }).select("_id").lean();
  let updatedLiveClasses = 0;
  for (const batch of batches) {
    updatedLiveClasses += await applyPermanentMeetLinkToBatchLiveClasses(
      String(batch._id),
      source,
    );
  }

  return {
    meetLink: source,
    updatedBatches: batchResult.modifiedCount ?? 0,
    updatedLiveClasses,
  };
}

import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Course from "@/models/Course";
import { loadWebsiteContentSettings } from "@/app/api/_lib/websiteContentStore";
import { formatInstructorCourseLine } from "@/lib/formatInstructorCourseLine";
import type { FeaturedInstructor } from "@/types/featured-instructor";
import { getDisplayName } from "@/lib/displayName";

const DEFAULT_AVATAR =
  "https://ui-avatars.com/api/?name=Instructor&background=1e3a8a&color=fff&size=512";

function displayName(user: Record<string, unknown>): string {
  return getDisplayName(user, "Instructor");
}

/** Homepage mentors carousel from CMS-selected instructor IDs. */
export async function getFeaturedInstructors(): Promise<FeaturedInstructor[]> {
  const raw = await loadWebsiteContentSettings();
  const ids = (raw as { homeInstructors?: { instructorIds?: string[] } })
    ?.homeInstructors?.instructorIds;
  if (!ids?.length) return [];

  const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
  if (validIds.length === 0) return [];

  await connectDB();
  const objectIds = validIds.map((id) => new mongoose.Types.ObjectId(id));

  const [users, courses] = await Promise.all([
    User.find({
      _id: { $in: objectIds },
      role: "instructor",
      isActive: true,
    })
      .select("name avatar experience")
      .lean(),
    Course.find({
      status: "published",
      isHidden: { $ne: true },
      $or: [
        { instructor: { $in: objectIds } },
        { createdBy: { $in: objectIds } },
      ],
    })
      .select("title instructor createdBy")
      .lean(),
  ]);

  const userById = new Map(
    users.map((u) => [String(u._id), u as Record<string, unknown>]),
  );

  const coursesByInstructor = new Map<string, string[]>();
  for (const course of courses) {
    const c = course as Record<string, unknown>;
    const title = String(c.title || "").trim();
    if (!title) continue;
    const instructorId = c.instructor
      ? String((c.instructor as mongoose.Types.ObjectId) || c.instructor)
      : "";
    const createdById = c.createdBy
      ? String((c.createdBy as mongoose.Types.ObjectId) || c.createdBy)
      : "";
    for (const id of [instructorId, createdById]) {
      if (!id || !userById.has(id)) continue;
      const list = coursesByInstructor.get(id) ?? [];
      if (!list.includes(title)) list.push(title);
      coursesByInstructor.set(id, list);
    }
  }

  const result: FeaturedInstructor[] = [];
  for (const id of validIds) {
    const user = userById.get(id);
    if (!user) continue;
    const courseTitles = coursesByInstructor.get(id) ?? [];
    const avatar = String(user.avatar || "").trim();
    const experience = String(user.experience || "").trim();
    result.push({
      id,
      name: displayName(user),
      image: avatar || DEFAULT_AVATAR,
      roleLine: formatInstructorCourseLine(courseTitles),
      ...(experience ? { experience } : {}),
    });
  }

  return result;
}

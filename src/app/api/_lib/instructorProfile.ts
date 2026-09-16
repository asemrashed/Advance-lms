import mongoose from "mongoose";
import Course from "@/models/Course";
import Enrollment from "@/models/Enrollment";
import CourseReview from "@/models/CourseReview";
import { getDisplayName } from "@/lib/displayName";

/** Fields populated on User for public course instructor cards. */
export const INSTRUCTOR_USER_SELECT =
  "name email role phone avatar bio address specialization experience socialLinks";

export function getInstructorDisplayName(
  user: Record<string, unknown> | null | undefined,
): string {
  return getDisplayName(user, "Unknown Instructor");
}

export function mapInstructorProfile(user: Record<string, unknown>) {
  const social = user.socialLinks as Record<string, unknown> | undefined;
  const socialLinks =
    social &&
    (social.linkedin || social.twitter || social.website)
      ? {
          linkedin: social.linkedin ? String(social.linkedin) : undefined,
          twitter: social.twitter ? String(social.twitter) : undefined,
          website: social.website ? String(social.website) : undefined,
        }
      : undefined;

  return {
    _id: String(user._id),
    name: getInstructorDisplayName(user),
    role: String(user.role || "instructor"),
    email: user.email ? String(user.email) : undefined,
    avatar: user.avatar ? String(user.avatar) : undefined,
    phone: user.phone ? String(user.phone) : undefined,
    address: user.address ? String(user.address) : undefined,
    bio: user.bio ? String(user.bio) : undefined,
    specialization: user.specialization
      ? String(user.specialization)
      : undefined,
    experience: user.experience ? String(user.experience) : undefined,
    socialLinks,
  };
}

export async function getInstructorStats(instructorId: string) {
  if (!mongoose.Types.ObjectId.isValid(instructorId)) {
    return { coursesCount: 0, studentsCount: 0, rating: 0 };
  }

  const oid = new mongoose.Types.ObjectId(instructorId);
  const courseFilter = {
    status: "published" as const,
    isHidden: { $ne: true },
    $or: [{ instructor: oid }, { createdBy: oid }],
  };

  const coursesCount = await Course.countDocuments(courseFilter);
  const courseIds = await Course.find(courseFilter).distinct("_id");

  if (courseIds.length === 0) {
    return { coursesCount: 0, studentsCount: 0, rating: 0 };
  }

  const [studentsCount, reviewAgg] = await Promise.all([
    Enrollment.countDocuments({
      course: { $in: courseIds },
      status: { $in: ["enrolled", "in_progress", "completed"] },
    }),
    CourseReview.aggregate<{ avg: number; count: number }>([
      {
        $match: {
          course: { $in: courseIds },
          isPublic: true,
          isApproved: true,
        },
      },
      {
        $group: {
          _id: null,
          avg: { $avg: "$rating" },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const avg = reviewAgg[0]?.count ? Number(reviewAgg[0].avg) : 0;
  const rating = avg > 0 ? Math.round(avg * 10) / 10 : 0;

  return { coursesCount, studentsCount, rating };
}

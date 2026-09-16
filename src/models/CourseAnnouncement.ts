import mongoose, { Document, Schema } from "mongoose";

export type CourseAnnouncementStatus = "draft" | "published" | "archived";

export interface ICourseAnnouncement extends Document {
  _id: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  title: string;
  body: string;
  liveSessionAt?: Date;
  liveSessionLink?: string;
  status: CourseAnnouncementStatus;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CourseAnnouncementSchema = new Schema<ICourseAnnouncement>(
  {
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Announcement title is required"],
      trim: true,
      maxlength: 200,
    },
    body: {
      type: String,
      required: [true, "Announcement body is required"],
      trim: true,
      maxlength: 5000,
    },
    liveSessionAt: { type: Date, index: true },
    liveSessionLink: { type: String, trim: true },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

CourseAnnouncementSchema.index({ courseId: 1, status: 1, createdAt: -1 });

const CourseAnnouncement =
  mongoose.models.CourseAnnouncement ||
  mongoose.model<ICourseAnnouncement>(
    "CourseAnnouncement",
    CourseAnnouncementSchema,
  );

export default CourseAnnouncement;

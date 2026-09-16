import mongoose, { Document, Schema } from "mongoose";

export interface ICourseReview extends Document {
  student: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  rating: number;
  reviewType: "text" | "video";
  title?: string;
  comment?: string;
  videoUrl?: string;
  videoThumbnail?: string;
  isVerified: boolean;
  isPublic: boolean;
  helpfulVotes: number;
  helpfulVoters: mongoose.Types.ObjectId[];
  reportedCount: number;
  isApproved: boolean;
  isDisplayed: boolean;
  displayOrder: number;
  displayStudentName?: string;
  instructorReply?: string;
  instructorRepliedAt?: Date;
  instructorRepliedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CourseReviewSchema = new Schema<ICourseReview>(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    reviewType: {
      type: String,
      enum: ["text", "video"],
      default: "text",
    },
    title: { type: String, trim: true },
    comment: { type: String, trim: true },
    videoUrl: { type: String, trim: true },
    videoThumbnail: { type: String, trim: true },
    isVerified: { type: Boolean, default: false },
    isPublic: { type: Boolean, default: true },
    helpfulVotes: { type: Number, default: 0, min: 0 },
    helpfulVoters: [{ type: Schema.Types.ObjectId, ref: "User" }],
    reportedCount: { type: Number, default: 0, min: 0 },
    isApproved: { type: Boolean, default: false },
    isDisplayed: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
    displayStudentName: { type: String, trim: true },
    instructorReply: { type: String, trim: true, maxlength: 2000 },
    instructorRepliedAt: { type: Date },
    instructorRepliedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

CourseReviewSchema.index({ course: 1, student: 1 }, { unique: true });
CourseReviewSchema.index({ course: 1, isApproved: 1, isPublic: 1, createdAt: -1 });

const CourseReview =
  mongoose.models.CourseReview ||
  mongoose.model<ICourseReview>("CourseReview", CourseReviewSchema);

export default CourseReview;

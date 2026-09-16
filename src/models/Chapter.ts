import mongoose, { Document, Schema } from "mongoose";

export interface IChapter extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  course: mongoose.Types.ObjectId;
  /** Set for live-course curriculum scoped to a batch cohort. */
  batchId?: mongoose.Types.ObjectId;
  /** Per-chapter instructor (migrated from legacy BatchClass). */
  instructorId?: mongoose.Types.ObjectId;
  /** Subject track label for notices / grouping (from legacy BatchClass title). */
  subjectLabel?: string;
  /** Optional Google Drive URL with materials for this topic/chapter. */
  topicDriveUrl?: string;
  order: number;
  isPublished: boolean;
  lessonCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

const ChapterSchema = new Schema<IChapter>(
  {
    title: {
      type: String,
      required: [true, "Chapter title is required"],
      trim: true,
      maxlength: [200, "Chapter title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course reference is required"],
    },
    batchId: {
      type: Schema.Types.ObjectId,
      ref: "Batch",
      index: true,
    },
    instructorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    subjectLabel: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    topicDriveUrl: {
      type: String,
      trim: true,
      maxlength: [2000, "Topic drive URL cannot exceed 2000 characters"],
    },
    order: {
      type: Number,
      required: [true, "Chapter order is required"],
      min: [1, "Chapter order must be at least 1"],
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

ChapterSchema.virtual("lessonCount", {
  ref: "Lesson",
  localField: "_id",
  foreignField: "chapter",
  count: true,
});

ChapterSchema.index({ course: 1, order: 1 });
ChapterSchema.index({ course: 1, batchId: 1, order: 1 });
ChapterSchema.index({ course: 1, isPublished: 1 });
ChapterSchema.index({ batchId: 1, order: 1 });

const Chapter =
  mongoose.models.Chapter || mongoose.model<IChapter>("Chapter", ChapterSchema);

export default Chapter;

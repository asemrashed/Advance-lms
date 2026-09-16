import mongoose, { Document, Schema } from "mongoose";
import type { LessonType } from "@/types/unifiedCourse";
import { defineModel } from "@/models/_lib/defineModel";

type LessonAttachment = {
  name: string;
  url: string;
  type: string;
  size?: number;
};

export interface ILesson extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  content?: string;
  lessonType: LessonType;
  chapter: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  batchId?: mongoose.Types.ObjectId;
  liveClassId?: mongoose.Types.ObjectId;
  pdfUrl?: string;
  order: number;
  duration?: number;
  youtubeVideoId?: string;
  videoUrl?: string;
  videoDuration?: number;
  attachments?: LessonAttachment[];
  isPublished: boolean;
  isFree: boolean;
  completionCount?: number;
  averageCompletionTime?: number;
  youtubeEmbedUrl?: string | null;
  youtubeThumbnailUrl?: string | null;
  youtubeWatchUrl?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const LessonSchema = new Schema<ILesson>(
  {
    title: {
      type: String,
      required: [true, "Lesson title is required"],
      trim: true,
      maxlength: [200, "Lesson title cannot exceed 200 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    content: {
      type: String,
      trim: true,
    },
    lessonType: {
      type: String,
      enum: ["recorded", "pdf", "text", "live"],
      default: "recorded",
      required: true,
      index: true,
    },
    chapter: {
      type: Schema.Types.ObjectId,
      ref: "Chapter",
      required: [true, "Chapter reference is required"],
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
    liveClassId: {
      type: Schema.Types.ObjectId,
      ref: "LiveClass",
      index: true,
    },
    pdfUrl: {
      type: String,
      trim: true,
    },
    order: {
      type: Number,
      required: [true, "Lesson order is required"],
      min: [1, "Lesson order must be at least 1"],
    },
    duration: {
      type: Number,
      min: [0, "Duration cannot be negative"],
    },
    youtubeVideoId: {
      type: String,
      trim: true,
      validate: {
        validator(v: string) {
          if (!v) return true;
          return /^[a-zA-Z0-9_-]{10,15}$/.test(v);
        },
        message: "Invalid YouTube video ID format",
      },
    },
    videoUrl: {
      type: String,
      trim: true,
    },
    videoDuration: {
      type: Number,
      min: [0, "Video duration cannot be negative"],
    },
    attachments: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        url: {
          type: String,
          required: true,
          trim: true,
        },
        type: {
          type: String,
          required: true,
          trim: true,
        },
        size: {
          type: Number,
          min: [0, "File size cannot be negative"],
        },
      },
    ],
    isPublished: {
      type: Boolean,
      default: false,
    },
    isFree: {
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

LessonSchema.virtual("youtubeEmbedUrl").get(function (this: ILesson) {
  return this.youtubeVideoId
    ? `https://www.youtube.com/embed/${this.youtubeVideoId}`
    : null;
});

LessonSchema.virtual("youtubeThumbnailUrl").get(function (this: ILesson) {
  return this.youtubeVideoId
    ? `https://img.youtube.com/vi/${this.youtubeVideoId}/maxresdefault.jpg`
    : null;
});

LessonSchema.virtual("youtubeWatchUrl").get(function (this: ILesson) {
  return this.youtubeVideoId
    ? `https://www.youtube.com/watch?v=${this.youtubeVideoId}`
    : null;
});

LessonSchema.index({ chapter: 1, order: 1 });
LessonSchema.index({ course: 1, batchId: 1, order: 1 });
LessonSchema.index({ course: 1, isPublished: 1 });
LessonSchema.index({ batchId: 1, lessonType: 1 });
LessonSchema.index({ course: 1, isFree: 1 });
LessonSchema.index({ youtubeVideoId: 1 });

const Lesson = defineModel("Lesson", LessonSchema);

export default Lesson;

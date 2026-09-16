import mongoose, { Schema, type Document } from "mongoose";

export type ResourceNoteAccessPolicy = "public" | "batch";
export type ResourceNoteScopeType = "batch" | "course" | "subject";

export interface IResourceNote extends Document {
  title: string;
  subject: string;
  subjectId?: mongoose.Types.ObjectId;
  subjectCode?: string;
  topic: string;
  grade?: string;
  scopeType?: ResourceNoteScopeType;
  batchId?: mongoose.Types.ObjectId;
  batchClassId?: mongoose.Types.ObjectId;
  subjectModuleId?: mongoose.Types.ObjectId;
  subjectLessonId?: mongoose.Types.ObjectId;
  courseId?: mongoose.Types.ObjectId;
  chapterId?: mongoose.Types.ObjectId;
  lessonId?: mongoose.Types.ObjectId;
  pdfUrl: string;
  pdfPublicId?: string;
  description?: string;
  isActive: boolean;
  accessPolicy: ResourceNoteAccessPolicy;
  uploadedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ResourceNoteSchema = new Schema<IResourceNote>(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    subject: {
      type: String,
      required: [true, "Subject is required"],
      trim: true,
      maxlength: [120, "Subject cannot exceed 120 characters"],
      index: true,
    },
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      index: true,
    },
    subjectCode: {
      type: String,
      trim: true,
      uppercase: true,
      index: true,
    },
    topic: {
      type: String,
      required: [true, "Topic is required"],
      trim: true,
      maxlength: [120, "Topic cannot exceed 120 characters"],
      index: true,
    },
    grade: {
      type: String,
      trim: true,
      index: true,
    },
    scopeType: {
      type: String,
      enum: ["batch", "course", "subject"],
      index: true,
    },
    batchId: {
      type: Schema.Types.ObjectId,
      ref: "Batch",
      index: true,
    },
    batchClassId: {
      type: Schema.Types.ObjectId,
      index: true,
    },
    subjectModuleId: {
      type: Schema.Types.ObjectId,
      index: true,
    },
    subjectLessonId: {
      type: Schema.Types.ObjectId,
      index: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      index: true,
    },
    chapterId: {
      type: Schema.Types.ObjectId,
      ref: "Chapter",
    },
    lessonId: {
      type: Schema.Types.ObjectId,
      ref: "Lesson",
      index: true,
    },
    pdfUrl: {
      type: String,
      required: [true, "PDF URL is required"],
      trim: true,
    },
    pdfPublicId: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    accessPolicy: {
      type: String,
      enum: ["public", "batch"],
      default: "public",
      index: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "resourcenotes",
  },
);

ResourceNoteSchema.index({ subject: 1, topic: 1, title: 1 });
ResourceNoteSchema.index({ createdAt: -1 });
ResourceNoteSchema.index({
  title: "text",
  subject: "text",
  topic: "text",
  description: "text",
});

const ResourceNote =
  mongoose.models.ResourceNote ||
  mongoose.model<IResourceNote>("ResourceNote", ResourceNoteSchema);

export default ResourceNote;

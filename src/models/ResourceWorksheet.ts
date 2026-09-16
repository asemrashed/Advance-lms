import mongoose, { Schema, type Document } from "mongoose";

export type ResourceWorksheetAccessPolicy = "public" | "batch";
export type ResourceWorksheetScopeType = "batch" | "course" | "subject";
export type ResourceWorksheetSourceType = "upload" | "course_qb";

export interface IResourceWorksheet extends Document {
  title: string;
  subject: string;
  subjectId?: mongoose.Types.ObjectId;
  subjectCode?: string;
  topic: string;
  grade?: string;
  scopeType?: ResourceWorksheetScopeType;
  batchId?: mongoose.Types.ObjectId;
  batchClassId?: mongoose.Types.ObjectId;
  subjectModuleId?: mongoose.Types.ObjectId;
  subjectLessonId?: mongoose.Types.ObjectId;
  courseId?: mongoose.Types.ObjectId;
  chapterId?: mongoose.Types.ObjectId;
  lessonId?: mongoose.Types.ObjectId;
  pdfUrl: string;
  pdfPublicId?: string;
  marksPdfUrl?: string;
  marksPdfPublicId?: string;
  sourceType: ResourceWorksheetSourceType;
  questionIds?: mongoose.Types.ObjectId[];
  description?: string;
  isActive: boolean;
  accessPolicy: ResourceWorksheetAccessPolicy;
  uploadedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ResourceWorksheetSchema = new Schema<IResourceWorksheet>(
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
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject", index: true },
    subjectCode: { type: String, trim: true, uppercase: true, index: true },
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
    batchId: { type: Schema.Types.ObjectId, ref: "Batch", index: true },
    batchClassId: { type: Schema.Types.ObjectId, index: true },
    subjectModuleId: { type: Schema.Types.ObjectId, index: true },
    subjectLessonId: { type: Schema.Types.ObjectId, index: true },
    courseId: { type: Schema.Types.ObjectId, ref: "Course", index: true },
    chapterId: { type: Schema.Types.ObjectId, ref: "Chapter" },
    lessonId: { type: Schema.Types.ObjectId, ref: "Lesson", index: true },
    pdfUrl: {
      type: String,
      required: [true, "PDF URL is required"],
      trim: true,
    },
    pdfPublicId: { type: String, trim: true },
    marksPdfUrl: { type: String, trim: true },
    marksPdfPublicId: { type: String, trim: true },
    sourceType: {
      type: String,
      enum: ["upload", "course_qb"],
      default: "upload",
      index: true,
    },
    questionIds: [{ type: Schema.Types.ObjectId, ref: "Question" }],
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    isActive: { type: Boolean, default: true, index: true },
    accessPolicy: {
      type: String,
      enum: ["public", "batch"],
      default: "public",
      index: true,
    },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", index: true },
  },
  { timestamps: true, collection: "resourceworksheets" },
);

ResourceWorksheetSchema.index({ scopeType: 1, subject: 1, topic: 1 });
ResourceWorksheetSchema.index({ createdAt: -1 });

const ResourceWorksheet =
  mongoose.models.ResourceWorksheet ||
  mongoose.model<IResourceWorksheet>("ResourceWorksheet", ResourceWorksheetSchema);

export default ResourceWorksheet;

/**
 * One-time migration schemas — retained for `scripts/migrate-batch-curriculum.ts` only.
 * Not used by the application runtime after Phase 20.4 migration.
 */
import mongoose, { Schema } from "mongoose";

const BatchClassSchema = new Schema(
  {
    batchId: { type: Schema.Types.ObjectId, ref: "Batch", required: true },
    title: { type: String, required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    instructorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const SubjectModuleSchema = new Schema(
  {
    batchId: { type: Schema.Types.ObjectId, ref: "Batch", required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: "BatchClass", required: true },
    title: { type: String, required: true },
    description: String,
    order: { type: Number, required: true, default: 1 },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const SubjectLessonSchema = new Schema(
  {
    batchId: { type: Schema.Types.ObjectId, ref: "Batch", required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: "BatchClass", required: true },
    moduleId: { type: Schema.Types.ObjectId, ref: "SubjectModule", required: true },
    title: { type: String, required: true },
    description: String,
    order: { type: Number, required: true, default: 1 },
    type: { type: String, enum: ["live", "recorded"], default: "recorded" },
    scheduledAt: Date,
    durationMinutes: Number,
    meetLink: String,
    recordingUrl: String,
    videoUrl: String,
    youtubeVideoId: String,
    liveClassId: { type: Schema.Types.ObjectId, ref: "LiveClass" },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const LegacyBatchClass =
  mongoose.models.BatchClass ||
  mongoose.model("BatchClass", BatchClassSchema);

export const LegacySubjectModule =
  mongoose.models.SubjectModule ||
  mongoose.model("SubjectModule", SubjectModuleSchema);

export const LegacySubjectLesson =
  mongoose.models.SubjectLesson ||
  mongoose.model("SubjectLesson", SubjectLessonSchema);

import mongoose, { Document, Schema } from "mongoose";
import { defineModel } from "@/models/_lib/defineModel";

export interface IPracticeTestQuestion {
  question: mongoose.Types.ObjectId;
  marks: number;
  order: number;
}

export interface IBatchPracticeTest extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  course: mongoose.Types.ObjectId;
  /** @deprecated Course-scoped tests omit batch. Kept optional for legacy rows. */
  batch?: mongoose.Types.ObjectId;
  chapter: mongoose.Types.ObjectId;
  lesson?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  durationMinutes: number;
  totalMarks: number;
  questions: IPracticeTestQuestion[];
  status: "draft" | "published" | "archived";
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PracticeTestQuestionSchema = new Schema<IPracticeTestQuestion>(
  {
    question: {
      type: Schema.Types.ObjectId,
      ref: "Question",
      required: true,
    },
    marks: { type: Number, required: true, min: 0, default: 1 },
    order: { type: Number, required: true, min: 0, default: 0 },
  },
  { _id: false },
);

const BatchPracticeTestSchema = new Schema<IBatchPracticeTest>(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: 200,
    },
    description: { type: String, trim: true, maxlength: 2000 },
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    batch: {
      type: Schema.Types.ObjectId,
      ref: "Batch",
      index: true,
    },
    chapter: {
      type: Schema.Types.ObjectId,
      ref: "Chapter",
      required: true,
      index: true,
    },
    lesson: {
      type: Schema.Types.ObjectId,
      ref: "Lesson",
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    durationMinutes: { type: Number, required: true, min: 1, default: 60 },
    totalMarks: { type: Number, required: true, min: 0, default: 0 },
    questions: { type: [PracticeTestQuestionSchema], default: [] },
    status: {
      type: String,
      enum: ["draft", "published", "archived"],
      default: "draft",
      index: true,
    },
    publishedAt: { type: Date },
  },
  { timestamps: true, collection: "batch_practice_tests" },
);

BatchPracticeTestSchema.index({ createdBy: 1, updatedAt: -1 });
BatchPracticeTestSchema.index({ batch: 1, status: 1 });
BatchPracticeTestSchema.index({ chapter: 1, lesson: 1, status: 1 });

const BatchPracticeTest = defineModel(
  "BatchPracticeTest",
  BatchPracticeTestSchema,
  {
    ensurePaths: {
      chapter: {
        type: Schema.Types.ObjectId,
        ref: "Chapter",
        required: true,
        index: true,
      },
      lesson: {
        type: Schema.Types.ObjectId,
        ref: "Lesson",
        index: true,
      },
    },
  },
);

export default BatchPracticeTest;

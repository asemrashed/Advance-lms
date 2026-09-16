import mongoose, { Schema, type Document } from "mongoose";
import { defineModel } from "@/models/_lib/defineModel";

export interface ITestYourselfTest extends Document {
  subject: string;
  topic: string;
  name: string;
  grade?: string;
  /** Questions shown to non-enrolled users per attempt. Default 5. */
  freeQuestionLimit: number;
  /** Questions sampled for enrolled users per attempt. Default 12. */
  enrolledQuestionLimit: number;
  isPublished: boolean;
  isActive: boolean;
  courseId?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const TestYourselfTestSchema = new Schema<ITestYourselfTest>(
  {
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      index: true,
    },
    topic: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 250,
    },
    grade: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    freeQuestionLimit: {
      type: Number,
      default: 5,
      min: 1,
      max: 100,
    },
    enrolledQuestionLimit: {
      type: Number,
      default: 12,
      min: 1,
      max: 200,
    },
    isPublished: {
      type: Boolean,
      default: true,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

TestYourselfTestSchema.index(
  { subject: 1, topic: 1, grade: 1 },
  { unique: true, name: "uniq_testyourself_subject_topic_grade" },
);

const TestYourselfTest = defineModel(
  "TestYourselfTest",
  TestYourselfTestSchema,
);

export default TestYourselfTest;

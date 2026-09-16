import mongoose, { Schema, type Document, type Model } from "mongoose";

export type TestYourselfAttemptMode = "full" | "topic";

export interface ITestYourselfAttempt extends Document {
  userId?: mongoose.Types.ObjectId;
  subject: string;
  topic?: string;
  mode: TestYourselfAttemptMode;
  difficulty?: number;
  score: number;
  total: number;
  questionIds: mongoose.Types.ObjectId[];
  fullAccess: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TestYourselfAttemptSchema = new Schema<ITestYourselfAttempt>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      index: true,
    },
    topic: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    mode: {
      type: String,
      enum: ["full", "topic"],
      required: true,
    },
    difficulty: {
      type: Number,
      min: 1,
      max: 3,
    },
    score: {
      type: Number,
      required: true,
      min: 0,
    },
    total: {
      type: Number,
      required: true,
      min: 0,
    },
    questionIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "PlatformQuestion" }],
      default: [],
    },
    fullAccess: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

TestYourselfAttemptSchema.index({ userId: 1, createdAt: -1 });
TestYourselfAttemptSchema.index({ subject: 1, createdAt: -1 });

const TestYourselfAttempt =
  (mongoose.models.TestYourselfAttempt as Model<ITestYourselfAttempt>) ||
  mongoose.model<ITestYourselfAttempt>(
    "TestYourselfAttempt",
    TestYourselfAttemptSchema,
  );

export default TestYourselfAttempt;

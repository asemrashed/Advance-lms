import mongoose, { Document, Schema } from "mongoose";

export type PracticeTestAttemptStatus =
  | "in_progress"
  | "submitted"
  | "pending_review";

export interface IPracticeTestAnswer {
  question: mongoose.Types.ObjectId;
  selectedOptions: string[];
  writtenAnswer?: string;
}

export interface IPracticeTestAttempt extends Document {
  _id: mongoose.Types.ObjectId;
  practiceTest: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  attemptNumber: number;
  status: PracticeTestAttemptStatus;
  answers: IPracticeTestAnswer[];
  currentQuestionIndex: number;
  startedAt: Date;
  expiresAt: Date;
  submittedAt?: Date;
  earnedMarks: number;
  totalMarks: number;
  createdAt: Date;
  updatedAt: Date;
}

const PracticeTestAnswerSchema = new Schema<IPracticeTestAnswer>(
  {
    question: {
      type: Schema.Types.ObjectId,
      ref: "Question",
      required: true,
    },
    selectedOptions: { type: [String], default: [] },
    writtenAnswer: { type: String, default: "" },
  },
  { _id: false },
);

const PracticeTestAttemptSchema = new Schema<IPracticeTestAttempt>(
  {
    practiceTest: {
      type: Schema.Types.ObjectId,
      ref: "BatchPracticeTest",
      required: true,
      index: true,
    },
    student: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    attemptNumber: { type: Number, required: true, min: 1 },
    status: {
      type: String,
      enum: ["in_progress", "submitted", "pending_review"],
      default: "in_progress",
      index: true,
    },
    answers: { type: [PracticeTestAnswerSchema], default: [] },
    currentQuestionIndex: { type: Number, default: 0, min: 0 },
    startedAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    submittedAt: { type: Date },
    earnedMarks: { type: Number, default: 0, min: 0 },
    totalMarks: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, collection: "practice_test_attempts" },
);

PracticeTestAttemptSchema.index(
  { practiceTest: 1, student: 1, status: 1 },
  { name: "practice_test_student_status" },
);
PracticeTestAttemptSchema.index(
  { practiceTest: 1, student: 1, attemptNumber: 1 },
  { unique: true },
);

const PracticeTestAttempt =
  mongoose.models.PracticeTestAttempt ||
  mongoose.model<IPracticeTestAttempt>(
    "PracticeTestAttempt",
    PracticeTestAttemptSchema,
  );

export default PracticeTestAttempt;

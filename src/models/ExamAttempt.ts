import mongoose, { Document, Schema } from "mongoose";

export interface IExamAttempt extends Document {
  _id: mongoose.Types.ObjectId;
  exam: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  answers: {
    question: mongoose.Types.ObjectId;
    selectedOptions?: string[];
    writtenAnswer?: string;
    isCorrect?: boolean;
    marksObtained?: number;
    timeSpent?: number;
    isAnswered: boolean;
    gradingStatus?: "pending" | "graded";
  }[];
  totalMarks: number;
  marksObtained: number;
  percentage: number;
  isPassed: boolean;
  status: "in_progress" | "completed" | "pending_review" | "abandoned" | "timeout";
  startTime: Date;
  endTime?: Date;
  timeSpent: number;
  isSubmitted: boolean;
  submittedAt?: Date;
  attemptNumber: number;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ExamAnswerSchema = new Schema(
  {
    question: {
      type: Schema.Types.ObjectId,
      ref: "Question",
      required: true,
    },
    selectedOptions: {
      type: [String],
      default: [],
    },
    writtenAnswer: {
      type: String,
      trim: true,
    },
    isCorrect: {
      type: Boolean,
    },
    marksObtained: {
      type: Number,
      min: 0,
    },
    gradingStatus: {
      type: String,
      enum: ["pending", "graded"],
    },
    timeSpent: {
      type: Number,
      min: 0,
    },
    isAnswered: {
      type: Boolean,
      default: false,
      required: true,
    },
  },
  { _id: false },
);

const ExamAttemptSchema = new Schema<IExamAttempt>(
  {
    exam: {
      type: Schema.Types.ObjectId,
      ref: "Exam",
      required: true,
      index: true,
    },
    student: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    answers: {
      type: [ExamAnswerSchema],
      default: [],
    },
    totalMarks: {
      type: Number,
      required: true,
      min: 0,
    },
    marksObtained: {
      type: Number,
      default: 0,
      min: 0,
    },
    percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    isPassed: {
      type: Boolean,
      default: false,
      index: true,
    },
    status: {
      type: String,
      enum: ["in_progress", "completed", "pending_review", "abandoned", "timeout"],
      default: "in_progress",
      required: true,
      index: true,
    },
    startTime: {
      type: Date,
      default: Date.now,
      required: true,
    },
    endTime: {
      type: Date,
    },
    timeSpent: {
      type: Number,
      default: 0,
      min: 0,
    },
    isSubmitted: {
      type: Boolean,
      default: false,
      index: true,
    },
    submittedAt: {
      type: Date,
    },
    attemptNumber: {
      type: Number,
      default: 1,
      min: 1,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    userAgent: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true },
);

ExamAttemptSchema.index({ exam: 1, student: 1, attemptNumber: 1 }, { unique: true });
ExamAttemptSchema.index({ student: 1, createdAt: -1 });

const ExamAttempt =
  mongoose.models.ExamAttempt ||
  mongoose.model<IExamAttempt>("ExamAttempt", ExamAttemptSchema);
export default ExamAttempt;

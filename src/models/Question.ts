import mongoose, { Document, Schema } from "mongoose";
import { defineModel } from "@/models/_lib/defineModel";

export interface IQuestion extends Document {
  _id: mongoose.Types.ObjectId;
  question: string;
  type: "mcq" | "written" | "true_false" | "fill_blank" | "essay";
  marks: number;
  difficulty: "easy" | "medium" | "hard";
  category?: string;
  tags?: string[];
  options?: {
    text: string;
    isCorrect: boolean;
    explanation?: string;
  }[];
  correctAnswer?: string;
  explanation?: string;
  hints?: string[];
  timeLimit?: number;
  isActive: boolean;
  createdBy: mongoose.Types.ObjectId;
  exam?: mongoose.Types.ObjectId;
  /** When set, this MCQ belongs to a lesson quiz (mutually exclusive with `exam` in routes). */
  lesson?: mongoose.Types.ObjectId;
  /** Set when copied from Platform QB on access approval (instructor editable clone). */
  sourcePlatformQuestionId?: mongoose.Types.ObjectId;
  subjectId?: mongoose.Types.ObjectId;
  subject?: string;
  subjectCode?: string;
  grade?: string;
  componentId?: string;
  topic?: string;
  subtopic?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface IQuestionOption {
  text: string;
  isCorrect: boolean;
  explanation?: string;
}

const QuestionOptionSchema = new Schema<IQuestionOption>(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },
    isCorrect: {
      type: Boolean,
      default: false,
      required: true,
    },
    explanation: {
      type: String,
      trim: true,
    },
  },
  { _id: false },
);

const QuestionSchema = new Schema<IQuestion>(
  {
    question: {
      type: String,
      required: [true, "Question text is required"],
      trim: true,
    },
    type: {
      type: String,
      enum: ["mcq", "written", "true_false", "fill_blank", "essay"],
      default: "mcq",
      required: true,
      index: true,
    },
    marks: {
      type: Number,
      required: true,
      min: 0,
    },
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium",
      required: true,
      index: true,
    },
    category: {
      type: String,
      trim: true,
    },
    tags: {
      type: [String],
      default: [],
    },
    options: {
      type: [QuestionOptionSchema],
      default: [],
    },
    correctAnswer: {
      type: String,
      trim: true,
    },
    explanation: {
      type: String,
      trim: true,
    },
    hints: {
      type: [String],
      default: [],
    },
    timeLimit: {
      type: Number,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    exam: {
      type: Schema.Types.ObjectId,
      ref: "Exam",
      index: true,
    },
    lesson: {
      type: Schema.Types.ObjectId,
      ref: "Lesson",
      index: true,
    },
    sourcePlatformQuestionId: {
      type: Schema.Types.ObjectId,
      ref: "PlatformQuestion",
      index: true,
    },
    subjectId: {
      type: Schema.Types.ObjectId,
      ref: "Subject",
      index: true,
    },
    subject: { type: String, trim: true, index: true },
    subjectCode: { type: String, trim: true },
    grade: { type: String, trim: true, index: true },
    componentId: { type: String, trim: true },
    topic: { type: String, trim: true, index: true },
    subtopic: { type: String, trim: true },
  },
  { timestamps: true },
);

QuestionSchema.index({ createdAt: -1 });
QuestionSchema.index({ lesson: 1, isActive: 1 });
QuestionSchema.index({ createdBy: 1, sourcePlatformQuestionId: 1 });
QuestionSchema.index({ createdBy: 1, tags: 1 });

const Question = defineModel("Question", QuestionSchema, {
  ensurePaths: {
    sourcePlatformQuestionId: {
      type: Schema.Types.ObjectId,
      ref: "PlatformQuestion",
      index: true,
    },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject", index: true },
    subject: { type: String, trim: true, index: true },
    subjectCode: { type: String, trim: true },
    grade: { type: String, trim: true, index: true },
    componentId: { type: String, trim: true },
    topic: { type: String, trim: true, index: true },
    subtopic: { type: String, trim: true },
  },
});

export default Question;

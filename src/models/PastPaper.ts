import mongoose, { Schema, type Document } from "mongoose";
import { defineModel } from "@/models/_lib/defineModel";

export interface IPastPaper extends Document {
  course?: mongoose.Types.ObjectId;
  subjectId?: mongoose.Types.ObjectId;
  subjectCode?: string;
  sessionName: string;
  year: number;
  subject: string;
  grade?: string;
  examType: string;
  questionPaperUrl?: string;
  marksPdfUrl?: string;
  workSolutionUrl?: string;
  description?: string;
  tags?: string;
  isActive?: boolean;
  uploadedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PastPaperSchema = new Schema<IPastPaper>(
  {
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
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
    sessionName: {
      type: String,
      required: [true, "Session name is required"],
      trim: true,
      maxlength: [100, "Session name cannot exceed 100 characters"],
    },
    year: {
      type: Number,
      required: [true, "Year is required"],
      min: [1900, "Year must be at least 1900"],
      validate: {
        validator(value: number) {
          return value <= new Date().getFullYear() + 1;
        },
        message: "Year cannot be in the future",
      },
      index: true,
    },
    subject: {
      type: String,
      required: [true, "Subject is required"],
      trim: true,
      maxlength: [100, "Subject cannot exceed 100 characters"],
      index: true,
    },
    grade: {
      type: String,
      trim: true,
      index: true,
    },
    examType: {
      type: String,
      required: [true, "Exam type is required"],
      trim: true,
      maxlength: [50, "Exam type cannot exceed 50 characters"],
      index: true,
    },
    questionPaperUrl: {
      type: String,
      trim: true,
    },
    marksPdfUrl: {
      type: String,
      trim: true,
    },
    workSolutionUrl: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    tags: {
      type: String,
      trim: true,
      maxlength: [200, "Tags cannot exceed 200 characters"],
    },
    isActive: {
      type: Boolean,
      default: true,
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
    collection: "passpapers",
  },
);

PastPaperSchema.index(
  { subject: 1, sessionName: 1, year: 1, examType: 1, grade: 1 },
  { unique: true, name: "uniq_pastpaper_subject_session_year_exam_grade" },
);
PastPaperSchema.index({ createdAt: -1 });
PastPaperSchema.index({
  sessionName: "text",
  subject: "text",
  examType: "text",
  description: "text",
  tags: "text",
});

const PastPaper = defineModel("PastPaper", PastPaperSchema);

export default PastPaper;

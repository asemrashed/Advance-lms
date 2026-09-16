import mongoose, { Document, Schema } from "mongoose";

export interface IAssignmentAttachment {
  name: string;
  url: string;
  type: string;
  size?: number;
}

export interface IAssignmentRubric {
  criteria: string;
  description: string;
  marks: number;
}

export interface IAssignmentMcqQuestion {
  id: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
  marks: number;
}

export interface IAssignment extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  instructions?: string;
  type:
    | "pdf"
    | "mcq"
    | "essay"
    | "file_upload"
    | "quiz"
    | "project"
    | "presentation";
  course: mongoose.Types.ObjectId;
  chapter?: mongoose.Types.ObjectId;
  lesson?: mongoose.Types.ObjectId;
  subject?: string;
  grade?: string;
  createdBy: mongoose.Types.ObjectId;
  totalMarks: number;
  passingMarks: number;
  dueDate?: Date;
  startDate?: Date;
  isActive: boolean;
  isPublished: boolean;
  allowLateSubmission: boolean;
  latePenaltyPercentage?: number;
  maxAttempts: number;
  allowedFileTypes: string[];
  maxFileSize?: number;
  attachments: IAssignmentAttachment[];
  rubric: IAssignmentRubric[];
  mcqQuestions: IAssignmentMcqQuestion[];
  isGroupAssignment: boolean;
  maxGroupSize?: number;
  autoGrade: boolean;
  timeLimit?: number;
  showCorrectAnswers: boolean;
  allowReview: boolean;
  status: "draft" | "scheduled" | "active" | "expired" | "inactive" | "published";
  createdAt: Date;
  updatedAt: Date;
}

const AssignmentAttachmentSchema = new Schema<IAssignmentAttachment>(
  {
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    type: { type: String, required: true, trim: true },
    size: { type: Number, min: 0 },
  },
  { _id: false },
);

const AssignmentRubricSchema = new Schema<IAssignmentRubric>(
  {
    criteria: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    marks: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const AssignmentMcqQuestionSchema = new Schema<IAssignmentMcqQuestion>(
  {
    id: { type: String, required: true, trim: true },
    question: { type: String, required: true, trim: true },
    options: { type: [String], required: true, default: [] },
    correctOptionIndex: { type: Number, required: true, min: 0 },
    marks: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const AssignmentSchema = new Schema<IAssignment>(
  {
    title: { type: String, required: true, trim: true, index: true },
    description: { type: String, trim: true },
    instructions: { type: String, trim: true },
    type: {
      type: String,
      enum: ["pdf", "mcq", "essay", "file_upload", "quiz", "project", "presentation"],
      required: true,
      default: "pdf",
      index: true,
    },
    course: { type: Schema.Types.ObjectId, ref: "Course", required: true, index: true },
    chapter: { type: Schema.Types.ObjectId, ref: "Chapter", index: true },
    lesson: { type: Schema.Types.ObjectId, ref: "Lesson", index: true },
    subject: { type: String, trim: true, index: true },
    grade: { type: String, trim: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    totalMarks: { type: Number, required: true, min: 1 },
    passingMarks: { type: Number, required: true, min: 0 },
    dueDate: { type: Date, index: true },
    startDate: { type: Date, index: true },
    isActive: { type: Boolean, default: true, index: true },
    isPublished: { type: Boolean, default: false, index: true },
    allowLateSubmission: { type: Boolean, default: false },
    latePenaltyPercentage: { type: Number, min: 0, max: 100 },
    maxAttempts: { type: Number, default: 1, min: 1 },
    allowedFileTypes: { type: [String], default: [] },
    maxFileSize: { type: Number, min: 1 },
    attachments: { type: [AssignmentAttachmentSchema], default: [] },
    rubric: { type: [AssignmentRubricSchema], default: [] },
    mcqQuestions: { type: [AssignmentMcqQuestionSchema], default: [] },
    isGroupAssignment: { type: Boolean, default: false },
    maxGroupSize: { type: Number, min: 2 },
    autoGrade: { type: Boolean, default: false },
    timeLimit: { type: Number, min: 1 },
    showCorrectAnswers: { type: Boolean, default: true },
    allowReview: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ["draft", "scheduled", "active", "expired", "inactive", "published"],
      default: "draft",
      index: true,
    },
  },
  { timestamps: true },
);

AssignmentSchema.index({ createdAt: -1 });
AssignmentSchema.index({ course: 1, status: 1 });
AssignmentSchema.index({ createdBy: 1, createdAt: -1 });

const Assignment =
  mongoose.models.Assignment ||
  mongoose.model<IAssignment>("Assignment", AssignmentSchema);

export default Assignment;

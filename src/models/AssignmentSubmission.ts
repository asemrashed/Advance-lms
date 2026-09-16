import mongoose, { Document, Schema } from "mongoose";

interface ISubmissionFile {
  name: string;
  url: string;
  type: string;
  size: number;
}

interface ISubmissionAnswer {
  questionId: string;
  answer: string | string[];
  isCorrect?: boolean;
}

interface IRubricScore {
  criteria: string;
  score: number;
  maxScore: number;
  feedback?: string;
}

export interface IPdfAnnotationStroke {
  points: number[];
  color: string;
  width: number;
  page?: number;
}

export interface IPdfAnnotationLayer {
  fileUrl: string;
  strokes: IPdfAnnotationStroke[];
  canvasWidth: number;
  canvasHeight: number;
}

export interface IPdfAnnotations {
  layers: IPdfAnnotationLayer[];
}

export interface IAssignmentSubmission extends Document {
  _id: mongoose.Types.ObjectId;
  assignment: mongoose.Types.ObjectId;
  student: mongoose.Types.ObjectId;
  content?: string;
  files: ISubmissionFile[];
  answers: ISubmissionAnswer[];
  status: "draft" | "submitted" | "graded" | "returned";
  submittedAt?: Date;
  gradedAt?: Date;
  gradedBy?: mongoose.Types.ObjectId;
  score?: number;
  maxScore: number;
  feedback?: string;
  pdfAnnotations?: IPdfAnnotations;
  rubricScores: IRubricScore[];
  isLate: boolean;
  latePenaltyApplied?: number;
  attemptNumber: number;
  timeSpent?: number;
  percentageScore?: number;
  grade?: string;
  passed?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SubmissionFileSchema = new Schema<ISubmissionFile>(
  {
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    type: { type: String, required: true, trim: true },
    size: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const SubmissionAnswerSchema = new Schema<ISubmissionAnswer>(
  {
    questionId: { type: String, required: true, trim: true },
    answer: { type: Schema.Types.Mixed, required: true },
    isCorrect: { type: Boolean },
  },
  { _id: false },
);

const RubricScoreSchema = new Schema<IRubricScore>(
  {
    criteria: { type: String, required: true, trim: true },
    score: { type: Number, required: true, min: 0 },
    maxScore: { type: Number, required: true, min: 0 },
    feedback: { type: String, trim: true },
  },
  { _id: false },
);

const PdfAnnotationStrokeSchema = new Schema<IPdfAnnotationStroke>(
  {
    points: { type: [Number], default: [] },
    color: { type: String, default: "#ef4444" },
    width: { type: Number, default: 2, min: 1 },
    page: { type: Number, min: 1 },
  },
  { _id: false },
);

const PdfAnnotationLayerSchema = new Schema<IPdfAnnotationLayer>(
  {
    fileUrl: { type: String, required: true, trim: true },
    strokes: { type: [PdfAnnotationStrokeSchema], default: [] },
    canvasWidth: { type: Number, default: 1, min: 1 },
    canvasHeight: { type: Number, default: 1, min: 1 },
  },
  { _id: false },
);

const PdfAnnotationsSchema = new Schema<IPdfAnnotations>(
  {
    layers: { type: [PdfAnnotationLayerSchema], default: [] },
  },
  { _id: false },
);

const AssignmentSubmissionSchema = new Schema<IAssignmentSubmission>(
  {
    assignment: { type: Schema.Types.ObjectId, ref: "Assignment", required: true, index: true },
    student: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    content: { type: String, trim: true },
    files: { type: [SubmissionFileSchema], default: [] },
    answers: { type: [SubmissionAnswerSchema], default: [] },
    status: {
      type: String,
      enum: ["draft", "submitted", "graded", "returned"],
      default: "submitted",
      index: true,
    },
    submittedAt: { type: Date },
    gradedAt: { type: Date },
    gradedBy: { type: Schema.Types.ObjectId, ref: "User" },
    score: { type: Number, min: 0 },
    maxScore: { type: Number, required: true, min: 1 },
    feedback: { type: String, trim: true },
    pdfAnnotations: { type: PdfAnnotationsSchema },
    rubricScores: { type: [RubricScoreSchema], default: [] },
    isLate: { type: Boolean, default: false, index: true },
    latePenaltyApplied: { type: Number, min: 0, max: 100 },
    attemptNumber: { type: Number, required: true, min: 1, default: 1 },
    timeSpent: { type: Number, min: 0 },
    percentageScore: { type: Number, min: 0, max: 100 },
    grade: { type: String, trim: true },
    passed: { type: Boolean },
  },
  { timestamps: true },
);

AssignmentSubmissionSchema.index({ assignment: 1, student: 1, attemptNumber: 1 }, { unique: true });
AssignmentSubmissionSchema.index({ student: 1, createdAt: -1 });

const AssignmentSubmission =
  mongoose.models.AssignmentSubmission ||
  mongoose.model<IAssignmentSubmission>("AssignmentSubmission", AssignmentSubmissionSchema);

export default AssignmentSubmission;

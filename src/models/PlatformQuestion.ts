import mongoose, { Document, Model, Schema } from "mongoose";

export type PlatformQuestionOwnerType = "admin" | "instructor";
export type PlatformQuestionAccessPolicy =
  | "private"
  | "shared_with_instructors"
  | "public";
export type PlatformQuestionSourceType =
  | "manual"
  | "claude"
  | "pdf"
  | "pastpaper";
export type PlatformQuestionFormat = "mcq" | "written";

/** Cambridge-style exam session codes (Feb/Mar, May/Jun, Oct/Nov). */
export type PastPaperSession = "FM" | "MJ" | "ON";
/** Diagram lifecycle for QP/MS figures that need a manual PNG crop upload. */
export type DiagramStatus = "none" | "missing" | "uploaded";
/** Whether a past-paper question is fully assembled (no missing diagrams). */
export type PastPaperStatus = "complete" | "incomplete";

export interface IPlatformQuestionOption {
  text: string;
  isCorrect: boolean;
}

export interface IPlatformQuestion extends Document {
  _id: mongoose.Types.ObjectId;
  subject: string;
  subjectId?: mongoose.Types.ObjectId;
  subjectCode?: string;
  grade?: string;
  /** Subject exam component this question belongs to. */
  componentId?: mongoose.Types.ObjectId;
  componentName?: string;
  componentType?: PlatformQuestionFormat;
  topic: string;
  subtopic?: string;
  difficulty: 1 | 2 | 3;
  questionFormat: PlatformQuestionFormat;
  questionText: string;
  options: IPlatformQuestionOption[];
  answerText?: string;
  explanation?: string;
  hasDiagram: boolean;
  diagramUrl?: string;
  ownerType: PlatformQuestionOwnerType;
  ownerId: mongoose.Types.ObjectId;
  accessPolicy: PlatformQuestionAccessPolicy;
  aiGenerated: boolean;
  aiModel?: string;
  aiTagConfidence?: number;
  tagVerified?: boolean;
  sourceType: PlatformQuestionSourceType;
  sourceFileId?: mongoose.Types.ObjectId;
  /** Public id from `POST /api/upload/pdf` when sourceType is pdf. */
  sourcePdfPublicId?: string;
  tags: string[];
  // ---- Past-paper fields (optional; only set when sourceType === "pastpaper") ----
  /** Stable, human-readable unique id used for idempotent import/upsert (e.g. "0580_MJ_2022_P42_Q7"). */
  qid?: string;
  /** Numeric topic index from the canonical taxonomy (see src/lib/pastPaperTopics.ts). */
  topicNumber?: number;
  /** Exam year, e.g. 2022. */
  year?: number;
  /** Exam session code. */
  session?: PastPaperSession;
  /** Paper code/variant, e.g. "42". */
  paper?: string;
  /** Original question number on the paper, e.g. "7(a)(ii)". */
  questionNumber?: string;
  /** Mark scheme text (worked answer) for this question. */
  msText?: string;
  /** Marks available for the question. */
  marks?: number;
  /** Calculator policy for the paper, e.g. "calculator" | "non-calculator". */
  calculatorType?: string;
  /** Question-paper diagram lifecycle. */
  diagramStatus?: DiagramStatus;
  /** Whether the mark scheme references a diagram/figure. */
  hasMsDiagram?: boolean;
  /** Mark-scheme diagram lifecycle. */
  msDiagramStatus?: DiagramStatus;
  /** Uploaded mark-scheme diagram URL (PNG crop). */
  msDiagramUrl?: string;
  /** Public id of the source question-paper PDF (`POST /api/upload/pdf`). */
  qpFileId?: string;
  /** Public id of the source mark-scheme PDF (`POST /api/upload/pdf`). */
  msFileId?: string;
  /** Derived completeness of the past-paper question (recomputed on save). */
  status?: PastPaperStatus;
  /** Free-form internal notes (e.g. why flagged incomplete). */
  notes?: string;
  /** Optional batch curriculum linkage (Phase 18+). */
  batchId?: mongoose.Types.ObjectId;
  batchClassId?: mongoose.Types.ObjectId;
  subjectModuleId?: mongoose.Types.ObjectId;
  subjectLessonId?: mongoose.Types.ObjectId;
  /** Optional course curriculum linkage. */
  courseId?: mongoose.Types.ObjectId;
  chapterId?: mongoose.Types.ObjectId;
  lessonId?: mongoose.Types.ObjectId;
  /** Set when this row is an instructor's editable copy of an admin platform question. */
  copiedFrom?: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const PlatformQuestionOptionSchema = new Schema<IPlatformQuestionOption>(
  {
    text: { type: String, required: true, trim: true },
    isCorrect: { type: Boolean, default: false, required: true },
  },
  { _id: false },
);

type PlatformQuestionModelType = Model<IPlatformQuestion>;

const PlatformQuestionSchema = new Schema<IPlatformQuestion, PlatformQuestionModelType>(
  {
    subject: {
      type: String,
      required: [true, "Subject is required"],
      trim: true,
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
    grade: {
      type: String,
      trim: true,
      index: true,
    },
    componentId: {
      type: Schema.Types.ObjectId,
      index: true,
    },
    componentName: {
      type: String,
      trim: true,
      index: true,
    },
    componentType: {
      type: String,
      enum: ["mcq", "written"],
      index: true,
    },
    topic: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    subtopic: { type: String, trim: true, index: true },
    difficulty: {
      type: Number,
      enum: [1, 2, 3],
      required: true,
      index: true,
    },
    questionFormat: {
      type: String,
      enum: ["mcq", "written"],
      default: "mcq",
      index: true,
    },
    questionText: {
      type: String,
      required: [true, "Question text is required"],
      trim: true,
    },
    options: {
      type: [PlatformQuestionOptionSchema],
      default: [],
    },
    answerText: { type: String, trim: true },
    explanation: { type: String, trim: true },
    hasDiagram: { type: Boolean, default: false },
    diagramUrl: { type: String, trim: true },
    ownerType: {
      type: String,
      enum: ["admin", "instructor"],
      required: true,
      index: true,
    },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    accessPolicy: {
      type: String,
      enum: ["private", "shared_with_instructors", "public"],
      default: "private",
      index: true,
    },
    aiGenerated: { type: Boolean, default: false, index: true },
    aiModel: { type: String, trim: true },
    aiTagConfidence: { type: Number, min: 0, max: 1 },
    tagVerified: { type: Boolean, default: false },
    sourceType: {
      type: String,
      enum: ["manual", "claude", "pdf", "pastpaper"],
      default: "manual",
      index: true,
    },
    sourceFileId: { type: Schema.Types.ObjectId },
    sourcePdfPublicId: { type: String, trim: true, index: true },
    tags: { type: [String], default: [] },
    qid: { type: String, trim: true, unique: true, sparse: true },
    topicNumber: { type: Number, index: true },
    year: { type: Number, index: true },
    session: { type: String, enum: ["FM", "MJ", "ON"], index: true },
    paper: { type: String, trim: true, index: true },
    questionNumber: { type: String, trim: true },
    msText: { type: String, trim: true },
    marks: { type: Number },
    calculatorType: { type: String, trim: true },
    diagramStatus: {
      type: String,
      enum: ["none", "missing", "uploaded"],
      default: "none",
    },
    hasMsDiagram: { type: Boolean, default: false },
    msDiagramStatus: {
      type: String,
      enum: ["none", "missing", "uploaded"],
      default: "none",
    },
    msDiagramUrl: { type: String, trim: true },
    qpFileId: { type: String, trim: true, index: true },
    msFileId: { type: String, trim: true, index: true },
    status: {
      type: String,
      enum: ["complete", "incomplete"],
      index: true,
    },
    notes: { type: String, trim: true },
    batchId: { type: Schema.Types.ObjectId, ref: "Batch", index: true },
    batchClassId: { type: Schema.Types.ObjectId, index: true },
    subjectModuleId: { type: Schema.Types.ObjectId, index: true },
    subjectLessonId: { type: Schema.Types.ObjectId, index: true },
    courseId: { type: Schema.Types.ObjectId, ref: "Course", index: true },
    chapterId: { type: Schema.Types.ObjectId, ref: "Chapter", index: true },
    lessonId: { type: Schema.Types.ObjectId, ref: "Lesson", index: true },
    copiedFrom: {
      type: Schema.Types.ObjectId,
      ref: "PlatformQuestion",
      index: true,
    },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

PlatformQuestionSchema.index({ subject: 1, topic: 1, createdAt: -1 });
PlatformQuestionSchema.index({ subjectId: 1, componentId: 1, createdAt: -1 });
PlatformQuestionSchema.index({ ownerId: 1, isActive: 1 });
// Dedup guard for copy-on-approve: one copy of an admin question per instructor.
PlatformQuestionSchema.index({ ownerId: 1, copiedFrom: 1 });
PlatformQuestionSchema.index({ sourceType: 1, session: 1, year: 1, paper: 1 });
PlatformQuestionSchema.index({ sourceType: 1, topicNumber: 1, status: 1 });

/**
 * Recompute `status` for past-paper questions: incomplete while any flagged
 * diagram (QP or MS) is still awaiting its manual PNG crop upload.
 */
PlatformQuestionSchema.pre("save", function () {
  if (!this.questionFormat) {
    this.questionFormat =
      Array.isArray(this.options) && this.options.length > 0 ? "mcq" : "written";
  }
  if (this.sourceType === "pastpaper") {
    const qpMissing = this.diagramStatus === "missing";
    const msMissing =
      Boolean(this.hasMsDiagram) && this.msDiagramStatus === "missing";
    this.status = qpMissing || msMissing ? "incomplete" : "complete";
  }
});

const PlatformQuestion =
  mongoose.models.PlatformQuestion ||
  mongoose.model<IPlatformQuestion>("PlatformQuestion", PlatformQuestionSchema);

export default PlatformQuestion;

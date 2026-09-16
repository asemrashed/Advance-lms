import mongoose, { Document, Schema } from "mongoose";

export interface IExam extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  type: "mcq" | "written" | "mixed";
  duration: number;
  totalMarks: number;
  passingMarks: number;
  instructions?: string;
  isActive: boolean;
  isPublished: boolean;
  startDate?: Date;
  endDate?: Date;
  course?: mongoose.Types.ObjectId;
  subject?: string;
  subjectCode?: string;
  grade?: string;
  /** Subject exam component this exam is for (type is derived from it). */
  componentId?: mongoose.Types.ObjectId;
  componentName?: string;
  createdBy: mongoose.Types.ObjectId;
  questions: mongoose.Types.ObjectId[];
  attempts: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showCorrectAnswers: boolean;
  showResults: boolean;
  allowReview: boolean;
  timeLimit: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ExamSchema = new Schema<IExam>(
  {
    title: {
      type: String,
      required: [true, "Exam title is required"],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: ["mcq", "written", "mixed"],
      default: "mcq",
      required: true,
      index: true,
    },
    duration: {
      type: Number,
      required: true,
      min: 1,
    },
    totalMarks: {
      type: Number,
      required: true,
      min: 0,
    },
    passingMarks: {
      type: Number,
      required: true,
      min: 0,
    },
    instructions: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isPublished: {
      type: Boolean,
      default: false,
      index: true,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      index: true,
    },
    subject: { type: String, trim: true, index: true },
    subjectCode: { type: String, trim: true, uppercase: true, index: true },
    grade: { type: String, trim: true, index: true },
    componentId: { type: Schema.Types.ObjectId, index: true },
    componentName: { type: String, trim: true, index: true },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    questions: {
      type: [Schema.Types.ObjectId],
      ref: "Question",
      default: [],
    },
    attempts: {
      type: Number,
      default: 0,
      min: 0,
    },
    shuffleQuestions: {
      type: Boolean,
      default: false,
    },
    shuffleOptions: {
      type: Boolean,
      default: false,
    },
    showCorrectAnswers: {
      type: Boolean,
      default: false,
    },
    showResults: {
      type: Boolean,
      default: true,
    },
    allowReview: {
      type: Boolean,
      default: true,
    },
    timeLimit: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

ExamSchema.index({ createdAt: -1 });
ExamSchema.index({ createdBy: 1, createdAt: -1 });

const Exam =
  mongoose.models.Exam || mongoose.model<IExam>("Exam", ExamSchema);
export default Exam;

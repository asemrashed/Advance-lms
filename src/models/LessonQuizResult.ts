import mongoose, { Document, Schema } from "mongoose";

export interface ILessonQuizResult extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  lesson: mongoose.Types.ObjectId;
  totalQuestions: number;
  correctAnswers: number;
  scorePercentage: number;
  answers: {
    questionId: string;
    selectedIndex: number;
    isCorrect: boolean;
  }[];
  isPracticeMode: boolean;
  startedAt: Date;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const LessonQuizAnswerSchema = new Schema(
  {
    questionId: { type: String, required: true },
    selectedIndex: { type: Number, required: true },
    isCorrect: { type: Boolean, required: true },
  },
  { _id: false },
);

const LessonQuizResultSchema = new Schema<ILessonQuizResult>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    lesson: {
      type: Schema.Types.ObjectId,
      ref: "Lesson",
      required: true,
      index: true,
    },
    totalQuestions: { type: Number, required: true, min: 0 },
    correctAnswers: { type: Number, required: true, min: 0 },
    scorePercentage: { type: Number, required: true, min: 0, max: 100 },
    answers: { type: [LessonQuizAnswerSchema], default: [] },
    isPracticeMode: { type: Boolean, default: false, index: true },
    startedAt: { type: Date, required: true },
    submittedAt: { type: Date, required: true },
  },
  { timestamps: true },
);

LessonQuizResultSchema.index({ user: 1, lesson: 1, isPracticeMode: 1 });

const LessonQuizResult =
  mongoose.models.LessonQuizResult ||
  mongoose.model<ILessonQuizResult>(
    "LessonQuizResult",
    LessonQuizResultSchema,
  );

export default LessonQuizResult;

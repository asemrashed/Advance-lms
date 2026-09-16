import mongoose, { Document, Schema } from "mongoose";

export type CourseProgressStatus = "in_progress" | "completed";

export interface ILessonProgressEntry {
  lesson: mongoose.Types.ObjectId;
  completed: boolean;
  completedAt?: Date;
}

export interface ICourseProgress extends Document {
  student: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  lessonProgress: ILessonProgressEntry[];
  completedLessons: number;
  totalLessons: number;
  progressPercentage: number;
  status: CourseProgressStatus;
  createdAt: Date;
  updatedAt: Date;
}

const LessonProgressEntrySchema = new Schema<ILessonProgressEntry>(
  {
    lesson: {
      type: Schema.Types.ObjectId,
      ref: "Lesson",
      required: true,
    },
    completed: {
      type: Boolean,
      default: false,
      required: true,
    },
    completedAt: {
      type: Date,
    },
  },
  { _id: false },
);

const CourseProgressSchema = new Schema<ICourseProgress>(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Student is required"],
      index: true,
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course is required"],
      index: true,
    },
    lessonProgress: {
      type: [LessonProgressEntrySchema],
      default: [],
    },
    completedLessons: {
      type: Number,
      min: 0,
      default: 0,
      required: true,
    },
    totalLessons: {
      type: Number,
      min: 0,
      default: 0,
      required: true,
    },
    progressPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
      required: true,
    },
    status: {
      type: String,
      enum: ["in_progress", "completed"],
      default: "in_progress",
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

CourseProgressSchema.index({ student: 1, course: 1 }, { unique: true });

const CourseProgress =
  mongoose.models.CourseProgress ||
  mongoose.model<ICourseProgress>("CourseProgress", CourseProgressSchema);

export default CourseProgress;

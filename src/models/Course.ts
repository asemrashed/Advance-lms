import mongoose, { Document, Schema } from "mongoose";
import type { CourseType } from "@/types/unifiedCourse";
import { defineModel } from "@/models/_lib/defineModel";

export interface ICourse extends Document {
  _id: mongoose.Types.ObjectId;
  /** recorded = direct enrollment; live = enroll via batches only. */
  courseType: CourseType;
  title: string;
  shortDescription?: string;
  description?: string;
  /** @deprecated Use subjectName — kept for legacy catalog filters */
  category?: string;
  subjectId?: mongoose.Types.ObjectId;
  subjectCode?: string;
  subjectName?: string;
  grade?: string;
  thumbnailUrl?: string;
  isPaid: boolean;
  status: "draft" | "published" | "archived" | "pending_approval";
  isHidden?: boolean;
  /** Full (pay-all-at-once) price. */
  price?: number;
  salePrice?: number;
  /** Monthly subscription price; when > 0, the monthly plan is offered. */
  monthlyPrice?: number;
  displayOrder?: number;
  createdBy?: mongoose.Types.ObjectId;
  instructor?: mongoose.Types.ObjectId;
  duration?: number;
  difficulty?: "beginner" | "intermediate" | "advanced";
  lessonCount?: number;
  enrollmentCount?: number;
  tags?: string[];
  /** Marketing bullets shown on public enroll / course detail sidebar */
  features?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const CourseSchema = new Schema<ICourse>(
  {
    courseType: {
      type: String,
      enum: ["recorded", "live"],
      default: "recorded",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: [true, "Course title is required"],
      trim: true,
    },
    shortDescription: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
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
    subjectName: {
      type: String,
      trim: true,
      index: true,
    },
    grade: {
      type: String,
      trim: true,
      index: true,
    },
    thumbnailUrl: {
      type: String,
      trim: true,
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["draft", "published", "archived", "pending_approval"],
      default: "draft",
      index: true,
    },
    isHidden: {
      type: Boolean,
      default: false,
      index: true,
    },
    price: {
      type: Number,
      min: 0,
    },
    salePrice: {
      type: Number,
      min: 0,
    },
    monthlyPrice: {
      type: Number,
      min: 0,
    },
    displayOrder: {
      type: Number,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    instructor: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    duration: {
      type: Number,
      min: 0,
    },
    difficulty: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
    },
    lessonCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    enrollmentCount: {
      type: Number,
      min: 0,
      default: 0,
    },
    tags: {
      type: [String],
      default: [],
    },
    features: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true },
);

CourseSchema.index({ title: "text", description: "text" });
/** Legacy `category` kept for old catalog rows; prefer subjectName/subjectCode indexes. */
CourseSchema.index({ subjectCode: 1 });
CourseSchema.index({ grade: 1 });
CourseSchema.index({ isPaid: 1 });
CourseSchema.index({ instructor: 1 });
CourseSchema.index({ createdAt: -1 });

const Course = defineModel("Course", CourseSchema);

export default Course;

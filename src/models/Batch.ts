import mongoose, { Document, Schema } from "mongoose";
import { BATCH_GRADES, type BatchGrade } from "@/lib/batchGrades";
import { defineModel } from "@/models/_lib/defineModel";

export type BatchScheduleRecurrence = "once" | "weekly" | "monthly";

/** @deprecated Legacy embedded slots — use RoutineSlot collection (Phase 17.8). */
export interface IBatchScheduleSlot {
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  startTime: string;
  endTime: string;
  title?: string;
  recurrence?: BatchScheduleRecurrence;
  liveClassId?: mongoose.Types.ObjectId;
  monthDay?: number;
}

export interface IBatch extends Document {
  _id: mongoose.Types.ObjectId;
  /** Parent live course; optional for legacy standalone batches. */
  courseId?: mongoose.Types.ObjectId;
  name: string;
  /** @deprecated Prefer batch classes + grade; kept for legacy rows. */
  subject: string;
  /** Primary instructor (legacy); synced from instructorIds[0] when set. */
  instructorId?: mongoose.Types.ObjectId;
  instructorIds: mongoose.Types.ObjectId[];
  grade: BatchGrade;
  /** @deprecated Use RoutineSlot collection. */
  schedule: IBatchScheduleSlot[];
  startDate: Date;
  endDate: Date;
  maxStudents: number;
  /** Monthly subscription fee; when > 0, the monthly plan is offered. */
  monthlyFee?: number;
  isActive: boolean;
  /** Legacy field — new batches are always approved; course approval is separate. */
  approvalStatus?: "pending" | "approved" | "rejected";
  description?: string;
  shortDescription?: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  features: string[];
  /** Permanent Google Meet URL shared by every live lesson in this batch. */
  meetLink?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BatchScheduleSlotSchema = new Schema<IBatchScheduleSlot>(
  {
    dayOfWeek: { type: Number, required: true, min: 0, max: 6 },
    startTime: { type: String, required: true, trim: true },
    endTime: { type: String, required: true, trim: true },
    title: { type: String, trim: true },
    recurrence: { type: String, enum: ["once", "weekly", "monthly"] },
    liveClassId: { type: Schema.Types.ObjectId, ref: "LiveClass" },
    monthDay: { type: Number, min: 1, max: 31 },
  },
  { _id: false },
);

const BatchSchema = new Schema<IBatch>(
  {
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      index: true,
    },
    name: {
      type: String,
      required: [true, "Batch name is required"],
      trim: true,
    },
    subject: {
      type: String,
      trim: true,
      default: "",
    },
    instructorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    instructorIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "User" }],
      default: [],
      index: true,
    },
    grade: {
      type: String,
      enum: BATCH_GRADES,
      default: "O",
      required: true,
      index: true,
    },
    schedule: {
      type: [BatchScheduleSlotSchema],
      default: [],
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
      index: true,
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
    },
    maxStudents: {
      type: Number,
      required: true,
      min: 1,
    },
    monthlyFee: {
      type: Number,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved",
    },
    description: { type: String, trim: true },
    shortDescription: { type: String, trim: true, default: "" },
    thumbnailUrl: { type: String, trim: true, default: "" },
    videoUrl: { type: String, trim: true },
    features: { type: [String], default: [] },
    meetLink: { type: String, trim: true },
  },
  { timestamps: true },
);

BatchSchema.index({ courseId: 1, isActive: 1, startDate: -1 });
BatchSchema.index({ isActive: 1, startDate: 1 });
BatchSchema.index({ instructorIds: 1, isActive: 1 });
BatchSchema.index({ isActive: 1, grade: 1 });

const Batch = defineModel("Batch", BatchSchema);

export default Batch;

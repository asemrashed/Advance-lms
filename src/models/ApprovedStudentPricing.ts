import mongoose, { Document, Schema } from "mongoose";
import { defineModel } from "@/models/_lib/defineModel";

export type ApprovedStudentPricingStatus = "active" | "revoked";
export type ApprovedStudentPricingBillingPlan = "monthly" | "full";

export interface IApprovedStudentPricing extends Document {
  _id: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  billingPlan: ApprovedStudentPricingBillingPlan;
  approvedAmount: number;
  listPrice: number;
  discountRequestId?: mongoose.Types.ObjectId;
  approvedBy: mongoose.Types.ObjectId;
  approvedAt: Date;
  note?: string;
  status: ApprovedStudentPricingStatus;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ApprovedStudentPricingSchema = new Schema<IApprovedStudentPricing>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    billingPlan: {
      type: String,
      enum: ["monthly", "full"],
      required: true,
    },
    approvedAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    listPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    discountRequestId: {
      type: Schema.Types.ObjectId,
      ref: "DiscountRequest",
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    approvedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    note: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: ["active", "revoked"],
      default: "active",
      required: true,
      index: true,
    },
    revokedAt: { type: Date },
  },
  { timestamps: true },
);

ApprovedStudentPricingSchema.index(
  { studentId: 1, courseId: 1, billingPlan: 1, status: 1 },
  { name: "student_course_plan_status" },
);

const ApprovedStudentPricing = defineModel(
  "ApprovedStudentPricing",
  ApprovedStudentPricingSchema,
);

export default ApprovedStudentPricing;

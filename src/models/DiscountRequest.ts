import mongoose, { Document, Schema } from "mongoose";
import { defineModel } from "@/models/_lib/defineModel";

export type DiscountRequestStatus = "pending" | "approved" | "rejected";
export type DiscountRequestBillingPlan = "monthly" | "full";

export interface IDiscountRequest extends Document {
  _id: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  courseId: mongoose.Types.ObjectId;
  selectedBatchId?: mongoose.Types.ObjectId;
  billingPlan: DiscountRequestBillingPlan;
  listPrice: number;
  requestedAmount?: number;
  message?: string;
  status: DiscountRequestStatus;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  approvedAmount?: number;
  rejectionNote?: string;
  approvedPricingId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DiscountRequestSchema = new Schema<IDiscountRequest>(
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
    selectedBatchId: {
      type: Schema.Types.ObjectId,
      ref: "Batch",
      index: true,
    },
    billingPlan: {
      type: String,
      enum: ["monthly", "full"],
      required: true,
    },
    listPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    requestedAmount: {
      type: Number,
      min: 0,
    },
    message: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      required: true,
      index: true,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: { type: Date },
    approvedAmount: { type: Number, min: 0 },
    rejectionNote: { type: String, trim: true, maxlength: 2000 },
    approvedPricingId: {
      type: Schema.Types.ObjectId,
      ref: "ApprovedStudentPricing",
    },
  },
  { timestamps: true },
);

DiscountRequestSchema.index({ status: 1, createdAt: -1 });
DiscountRequestSchema.index({ studentId: 1, courseId: 1, billingPlan: 1, status: 1 });
DiscountRequestSchema.index({ courseId: 1, status: 1 });

const DiscountRequest = defineModel("DiscountRequest", DiscountRequestSchema);

export default DiscountRequest;

import mongoose, { Document, Schema } from "mongoose";

export type BatchEnrollmentStatus =
  | "pending"
  | "active"
  | "suspended"
  | "dropped";

export type BatchEnrollmentPaymentStatus =
  | "pending"
  | "paid"
  | "failed";

export interface IBatchEnrollment extends Document {
  _id: mongoose.Types.ObjectId;
  batchId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  status: BatchEnrollmentStatus;
  paymentStatus: BatchEnrollmentPaymentStatus;
  paymentId?: string;
  paymentAmount?: number;
  /** Billing plan: monthly = time-bound access; full = one-time lifetime access. */
  billingPlan: "monthly" | "full";
  /** Access end date for monthly plan; unset/null for full (lifetime). */
  accessExpiresAt?: Date;
  /** When set, staff has blocked this student's access regardless of payment. */
  accessBlocked?: boolean;
  /** Grace deadline granted by staff — access allowed until this date even if unpaid/expired. */
  paymentDueAt?: Date;
  enrolledAt: Date;
  /** Admin note when batch filled after payment (Phase 20.4b). */
  reconcileNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BatchEnrollmentSchema = new Schema<IBatchEnrollment>(
  {
    batchId: {
      type: Schema.Types.ObjectId,
      ref: "Batch",
      required: [true, "Batch is required"],
      index: true,
    },
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Student is required"],
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "active", "suspended", "dropped"],
      default: "pending",
      required: true,
      index: true,
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
      required: true,
      index: true,
    },
    paymentId: {
      type: String,
      trim: true,
      index: true,
    },
    paymentAmount: {
      type: Number,
      min: 0,
    },
    billingPlan: {
      type: String,
      enum: ["monthly", "full"],
      default: "full",
      required: true,
      index: true,
    },
    accessExpiresAt: {
      type: Date,
      index: true,
    },
    accessBlocked: {
      type: Boolean,
      default: false,
      index: true,
    },
    paymentDueAt: {
      type: Date,
    },
    reconcileNote: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    enrolledAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

BatchEnrollmentSchema.index({ batchId: 1, studentId: 1 }, { unique: true });
BatchEnrollmentSchema.index({ batchId: 1, status: 1 });
BatchEnrollmentSchema.index({ studentId: 1, status: 1 });
BatchEnrollmentSchema.index({ enrolledAt: -1 });

const BatchEnrollment =
  mongoose.models.BatchEnrollment ||
  mongoose.model<IBatchEnrollment>("BatchEnrollment", BatchEnrollmentSchema);

export default BatchEnrollment;

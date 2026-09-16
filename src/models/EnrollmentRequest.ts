import mongoose, { Document, Schema } from "mongoose";

/** Offline "Enrolled in cash" request: student uploads proof, staff approves/rejects. */
export type EnrollmentRequestEntityType = "course" | "batch";
export type EnrollmentRequestStatus = "pending" | "approved" | "rejected";
export type EnrollmentRequestBillingPlan = "monthly" | "full";

export interface IEnrollmentRequest extends Document {
  _id: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  entityType: EnrollmentRequestEntityType;
  courseId?: mongoose.Types.ObjectId;
  /** Selected live section when a course request needs batch placement. */
  batchId?: mongoose.Types.ObjectId;
  billingPlan: EnrollmentRequestBillingPlan;
  amount?: number;
  /** Uploaded proof document URLs (PDF/images). */
  proofUrls: string[];
  note?: string;
  status: EnrollmentRequestStatus;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  rejectionNote?: string;
  /** Enrollment/BatchEnrollment created on approval. */
  enrollmentId?: mongoose.Types.ObjectId;
  batchEnrollmentId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const EnrollmentRequestSchema = new Schema<IEnrollmentRequest>(
  {
    studentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    entityType: {
      type: String,
      enum: ["course", "batch"],
      required: true,
      index: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      index: true,
    },
    batchId: {
      type: Schema.Types.ObjectId,
      ref: "Batch",
      index: true,
    },
    billingPlan: {
      type: String,
      enum: ["monthly", "full"],
      default: "full",
      required: true,
    },
    amount: {
      type: Number,
      min: 0,
    },
    proofUrls: {
      type: [String],
      default: [],
    },
    note: {
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
    rejectionNote: { type: String, trim: true, maxlength: 2000 },
    enrollmentId: {
      type: Schema.Types.ObjectId,
      ref: "Enrollment",
    },
    batchEnrollmentId: {
      type: Schema.Types.ObjectId,
      ref: "BatchEnrollment",
    },
  },
  { timestamps: true },
);

EnrollmentRequestSchema.index({ status: 1, createdAt: -1 });
EnrollmentRequestSchema.index({ studentId: 1, status: 1 });
EnrollmentRequestSchema.index({ courseId: 1, batchId: 1, status: 1 });
EnrollmentRequestSchema.index({ batchId: 1, status: 1 });

const EnrollmentRequest =
  mongoose.models.EnrollmentRequest ||
  mongoose.model<IEnrollmentRequest>(
    "EnrollmentRequest",
    EnrollmentRequestSchema,
  );

export default EnrollmentRequest;

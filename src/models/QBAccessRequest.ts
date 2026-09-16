import mongoose, { Document, Schema } from "mongoose";

/** Instructor requests access to admin platform question bank; admin approves with optional expiry. */
export type QBAccessRequestStatus = "pending" | "approved" | "rejected";

/** full = entire admin QB; subject = one subject; topics = specific topics within a subject. */
export type QBAccessScopeType = "full" | "subject" | "topics";

export interface IQBAccessRequest extends Document {
  _id: mongoose.Types.ObjectId;
  requesterId: mongoose.Types.ObjectId;
  status: QBAccessRequestStatus;
  scopeType: QBAccessScopeType;
  /** Topic names within the subject (only for scopeType "topics"). */
  topics: string[];
  isPaid: boolean;
  amount?: number;
  grantedAt?: Date;
  expiresAt?: Date;
  /** Admin who approved / granted directly. */
  grantedBy?: mongoose.Types.ObjectId;
  /** "admin_grant" when created from the admin Give Access flow. */
  source: "instructor_request" | "admin_grant";
  /** Number of questions copied into the instructor's bank on approval. */
  copiedCount?: number;
  copiedAt?: Date;
  note?: string;
  subjectId?: mongoose.Types.ObjectId;
  subjectCode?: string;
  subjectName?: string;
  grade?: string;
  createdAt: Date;
  updatedAt: Date;
}

const QBAccessRequestSchema = new Schema<IQBAccessRequest>(
  {
    requesterId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    scopeType: {
      type: String,
      enum: ["full", "subject", "topics"],
      default: "full",
      index: true,
    },
    topics: { type: [String], default: [] },
    isPaid: { type: Boolean, default: false },
    amount: { type: Number, min: 0 },
    grantedAt: { type: Date },
    expiresAt: { type: Date, index: true },
    grantedBy: { type: Schema.Types.ObjectId, ref: "User" },
    source: {
      type: String,
      enum: ["instructor_request", "admin_grant"],
      default: "instructor_request",
      index: true,
    },
    copiedCount: { type: Number, min: 0 },
    copiedAt: { type: Date },
    note: { type: String, trim: true },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject", index: true },
    subjectCode: { type: String, trim: true, uppercase: true, index: true },
    subjectName: { type: String, trim: true },
    grade: { type: String, trim: true, index: true },
  },
  { timestamps: true },
);

QBAccessRequestSchema.index({ requesterId: 1, status: 1 });

const QBAccessRequest =
  mongoose.models.QBAccessRequest ||
  mongoose.model<IQBAccessRequest>("QBAccessRequest", QBAccessRequestSchema);

export default QBAccessRequest;

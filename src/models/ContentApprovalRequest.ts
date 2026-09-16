import mongoose, { Document, Schema } from "mongoose";

export type ContentApprovalType = "course" | "batch";
export type ContentApprovalStatus = "pending" | "approved" | "rejected";

export interface IContentApprovalRequest extends Document {
  _id: mongoose.Types.ObjectId;
  type: ContentApprovalType;
  status: ContentApprovalStatus;
  courseId: mongoose.Types.ObjectId;
  batchId?: mongoose.Types.ObjectId;
  requestedBy: mongoose.Types.ObjectId;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewedAt?: Date;
  rejectionNote?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ContentApprovalRequestSchema = new Schema<IContentApprovalRequest>(
  {
    type: {
      type: String,
      enum: ["course", "batch"],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    courseId: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    batchId: {
      type: Schema.Types.ObjectId,
      ref: "Batch",
      index: true,
    },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    reviewedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    reviewedAt: { type: Date },
    rejectionNote: { type: String, trim: true },
  },
  { timestamps: true },
);

ContentApprovalRequestSchema.index({ status: 1, createdAt: -1 });
ContentApprovalRequestSchema.index(
  { courseId: 1, type: 1, status: 1 },
  { partialFilterExpression: { status: "pending" } },
);

const ContentApprovalRequest =
  mongoose.models.ContentApprovalRequest ||
  mongoose.model<IContentApprovalRequest>(
    "ContentApprovalRequest",
    ContentApprovalRequestSchema,
  );

export default ContentApprovalRequest;

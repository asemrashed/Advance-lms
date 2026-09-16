import mongoose, { Schema, type Document } from "mongoose";

export type InAppNotificationType =
  | "live_class_scheduled"
  | "live_class_updated"
  | "live_class_cancelled"
  | "routine_updated"
  | "routine_removed"
  | "routine_published"
  | "payment_renewal_due";

export interface IInAppNotification extends Document {
  userId: mongoose.Types.ObjectId;
  type: InAppNotificationType;
  title: string;
  message: string;
  batchId?: mongoose.Types.ObjectId;
  liveClassId?: mongoose.Types.ObjectId;
  routineSlotId?: mongoose.Types.ObjectId;
  /**
   * Unique key for idempotent inserts (e.g. payment renewal per period).
   * Sparse — only set when uniqueness is required.
   */
  dedupeKey?: string;
  metadata?: Record<string, unknown>;
  isRead: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const InAppNotificationSchema = new Schema<IInAppNotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: [
        "live_class_scheduled",
        "live_class_updated",
        "live_class_cancelled",
        "routine_updated",
        "routine_removed",
        "routine_published",
        "payment_renewal_due",
      ],
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    batchId: {
      type: Schema.Types.ObjectId,
      ref: "Batch",
      index: true,
    },
    liveClassId: {
      type: Schema.Types.ObjectId,
      ref: "LiveClass",
      index: true,
    },
    routineSlotId: {
      type: Schema.Types.ObjectId,
      ref: "RoutineSlot",
      index: true,
    },
    dedupeKey: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: "inappnotifications",
  },
);

InAppNotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
InAppNotificationSchema.index(
  { dedupeKey: 1 },
  { unique: true, sparse: true, name: "dedupeKey_1_unique_sparse" },
);

const InAppNotification =
  mongoose.models.InAppNotification ||
  mongoose.model<IInAppNotification>("InAppNotification", InAppNotificationSchema);

export default InAppNotification;

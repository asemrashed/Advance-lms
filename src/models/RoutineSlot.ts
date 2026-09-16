import mongoose, { Document, Schema } from "mongoose";

export type RoutineSlotStatus = "active" | "inactive";

export interface IRoutineSlot extends Document {
  _id: mongoose.Types.ObjectId;
  batchId: mongoose.Types.ObjectId;
  /** @deprecated Use chapterId — kept for unmigrated rows only. */
  batchClassId?: mongoose.Types.ObjectId;
  chapterId?: mongoose.Types.ObjectId;
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  startTime: string;
  endTime: string;
  topic: string;
  instructorId: mongoose.Types.ObjectId;
  status: RoutineSlotStatus;
  createdAt: Date;
  updatedAt: Date;
}

const RoutineSlotSchema = new Schema<IRoutineSlot>(
  {
    batchId: {
      type: Schema.Types.ObjectId,
      ref: "Batch",
      required: true,
      index: true,
    },
    batchClassId: {
      type: Schema.Types.ObjectId,
    },
    chapterId: {
      type: Schema.Types.ObjectId,
      ref: "Chapter",
      index: true,
    },
    dayOfWeek: {
      type: Number,
      required: true,
      min: 0,
      max: 6,
    },
    startTime: {
      type: String,
      required: true,
      trim: true,
    },
    endTime: {
      type: String,
      required: true,
      trim: true,
    },
    topic: {
      type: String,
      required: true,
      trim: true,
    },
    instructorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true },
);

RoutineSlotSchema.index({ batchId: 1, dayOfWeek: 1, startTime: 1 });

const RoutineSlot =
  mongoose.models.RoutineSlot ||
  mongoose.model<IRoutineSlot>("RoutineSlot", RoutineSlotSchema);

export default RoutineSlot;

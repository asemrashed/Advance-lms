import mongoose, { Document, Schema } from "mongoose";

export type AttendanceStatus = "present" | "absent" | "late";

export interface IAttendance extends Document {
  _id: mongoose.Types.ObjectId;
  liveClassId: mongoose.Types.ObjectId;
  batchId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  status: AttendanceStatus;
  markedAt: Date;
  markedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const AttendanceSchema = new Schema<IAttendance>(
  {
    liveClassId: {
      type: Schema.Types.ObjectId,
      ref: "LiveClass",
      required: [true, "Live class is required"],
      index: true,
    },
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
      enum: ["present", "absent", "late"],
      required: true,
      index: true,
    },
    markedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    markedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Marker is required"],
    },
  },
  {
    timestamps: true,
  },
);

AttendanceSchema.index({ liveClassId: 1, studentId: 1 }, { unique: true });
AttendanceSchema.index({ batchId: 1, liveClassId: 1 });
AttendanceSchema.index({ studentId: 1, batchId: 1 });

const Attendance =
  mongoose.models.Attendance ||
  mongoose.model<IAttendance>("Attendance", AttendanceSchema);

export default Attendance;

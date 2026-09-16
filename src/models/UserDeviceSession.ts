import mongoose, { Document, Schema } from "mongoose";
import { defineModel } from "@/models/_lib/defineModel";

export interface IUserDeviceSession extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  sessionId: string;
  deviceId: string;
  deviceLabel: string;
  userAgent: string;
  lastActiveAt: Date;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserDeviceSessionSchema = new Schema<IUserDeviceSession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    sessionId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    deviceId: {
      type: String,
      required: true,
      trim: true,
    },
    deviceLabel: {
      type: String,
      required: true,
      trim: true,
    },
    userAgent: {
      type: String,
      default: "",
      trim: true,
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

UserDeviceSessionSchema.index({ userId: 1, revokedAt: 1, createdAt: 1 });

const UserDeviceSession = defineModel("UserDeviceSession", UserDeviceSessionSchema);

export default UserDeviceSession;

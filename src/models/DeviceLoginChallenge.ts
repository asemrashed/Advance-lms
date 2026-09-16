import mongoose, { Document, Schema } from "mongoose";
import { defineModel } from "@/models/_lib/defineModel";

export interface IDeviceLoginChallenge extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  tokenHash: string;
  otpHash: string;
  otpExpires: Date;
  targetSessionId: string;
  deviceId: string;
  deviceLabel: string;
  userAgent: string;
  verified: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DeviceLoginChallengeSchema = new Schema<IDeviceLoginChallenge>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tokenHash: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    otpHash: {
      type: String,
      required: true,
      select: false,
    },
    otpExpires: {
      type: Date,
      required: true,
      select: false,
    },
    targetSessionId: {
      type: String,
      required: true,
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
    verified: {
      type: Boolean,
      default: false,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

const DeviceLoginChallenge = defineModel(
  "DeviceLoginChallenge",
  DeviceLoginChallengeSchema,
);

export default DeviceLoginChallenge;

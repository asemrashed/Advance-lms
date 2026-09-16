import mongoose, { Document, Schema } from "mongoose";

export interface ISettings extends Document {
  _id: mongoose.Types.ObjectId;
  category: string;
  settings: Record<string, unknown>;
  /** Last user who wrote this document (optional for legacy rows). */
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SettingsSchema = new Schema<ISettings>(
  {
    category: {
      type: String,
      required: [true, "Settings category is required"],
      trim: true,
      index: true,
      unique: true,
    },
    settings: {
      type: Schema.Types.Mixed,
      default: {},
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  { timestamps: true },
);

SettingsSchema.index({ updatedAt: -1 });
SettingsSchema.index({ updatedBy: 1 });

const Settings =
  mongoose.models.Settings || mongoose.model<ISettings>("Settings", SettingsSchema);

export default Settings;

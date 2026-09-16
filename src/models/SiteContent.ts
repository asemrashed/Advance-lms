import mongoose, { Document, Schema } from "mongoose";

export interface ISiteContent extends Document {
  _id: mongoose.Types.ObjectId;
  key: string;
  content: Record<string, unknown>;
  /** Last user who wrote this document (optional for legacy imports). */
  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SiteContentSchema = new Schema<ISiteContent>(
  {
    key: {
      type: String,
      required: [true, "Site content key is required"],
      trim: true,
      index: true,
      unique: true,
      default: "website-content",
    },
    content: {
      type: Schema.Types.Mixed,
      default: {},
    },
    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  { timestamps: true, collection: "site-content" },
);

SiteContentSchema.index({ updatedAt: -1 });
SiteContentSchema.index({ updatedBy: 1 });

const SiteContent =
  mongoose.models.SiteContent ||
  mongoose.model<ISiteContent>("SiteContent", SiteContentSchema, "site-content");

export default SiteContent;

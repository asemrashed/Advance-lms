import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IUploadedPdf extends Document {
  publicId: string;
  data: Buffer;
  size: number;
  fileName?: string;
  uploadedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const UploadedPdfSchema = new Schema<IUploadedPdf>(
  {
    publicId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    data: {
      type: Buffer,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    fileName: {
      type: String,
      trim: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true },
);

const UploadedPdf: Model<IUploadedPdf> =
  mongoose.models.UploadedPdf ||
  mongoose.model<IUploadedPdf>("UploadedPdf", UploadedPdfSchema);

export default UploadedPdf;

import mongoose, { Document, Schema, Types } from "mongoose";

export interface ICourseFAQ extends Document {
  _id: mongoose.Types.ObjectId;
  course: Types.ObjectId;
  question: string;
  answer: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const CourseFAQSchema = new Schema<ICourseFAQ>(
  {
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course is required"],
      index: true,
    },
    question: {
      type: String,
      required: [true, "Question is required"],
      trim: true,
      maxlength: [500, "Question cannot exceed 500 characters"],
    },
    answer: {
      type: String,
      required: [true, "Answer is required"],
      trim: true,
      maxlength: [5000, "Answer cannot exceed 5000 characters"],
    },
    order: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

CourseFAQSchema.index({ course: 1, order: 1 });

const CourseFAQ =
  mongoose.models.CourseFAQ ||
  mongoose.model<ICourseFAQ>("CourseFAQ", CourseFAQSchema);

export default CourseFAQ;

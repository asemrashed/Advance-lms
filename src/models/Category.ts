import mongoose, { Document, Schema } from "mongoose";

export interface ICategory extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  isActive?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, "Category slug is required"],
      trim: true,
      lowercase: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true },
);

CategorySchema.index({ slug: 1 }, { unique: true });
CategorySchema.index({ name: 1 });

const Category =
  mongoose.models.Category ||
  mongoose.model<ICategory>("Category", CategorySchema, "categories");

export default Category;

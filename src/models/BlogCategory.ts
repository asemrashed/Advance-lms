import mongoose, { Document, Schema } from "mongoose";

export interface IBlogCategory extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BlogCategorySchema = new Schema<IBlogCategory>(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      maxlength: [80, "Category name cannot exceed 80 characters"],
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
  { timestamps: true, collection: "blog_categories" },
);

BlogCategorySchema.index({ slug: 1 }, { unique: true });
BlogCategorySchema.index({ name: 1 });

const BlogCategory =
  mongoose.models.BlogCategory ||
  mongoose.model<IBlogCategory>("BlogCategory", BlogCategorySchema);

export default BlogCategory;

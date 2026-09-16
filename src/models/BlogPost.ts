import mongoose, { Document, Schema } from "mongoose";

export type BlogPostStatus = "draft" | "published";

export interface IBlogPost extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  thumbnailUrl?: string;
  categoryId: mongoose.Types.ObjectId;
  authorId: mongoose.Types.ObjectId;
  status: BlogPostStatus;
  publishedAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const BlogPostSchema = new Schema<IBlogPost>(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [200, "Title cannot exceed 200 characters"],
    },
    slug: {
      type: String,
      required: [true, "Slug is required"],
      trim: true,
      lowercase: true,
    },
    excerpt: {
      type: String,
      trim: true,
      maxlength: [500, "Excerpt cannot exceed 500 characters"],
      default: "",
    },
    content: {
      type: String,
      required: [true, "Content is required"],
    },
    thumbnailUrl: {
      type: String,
      trim: true,
      default: "",
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "BlogCategory",
      required: [true, "Category is required"],
      index: true,
    },
    authorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
      index: true,
    },
    publishedAt: {
      type: Date,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true, collection: "blog_posts" },
);

BlogPostSchema.index({ slug: 1 }, { unique: true });
BlogPostSchema.index({ status: 1, isActive: 1, publishedAt: -1 });
BlogPostSchema.index({ categoryId: 1, status: 1, publishedAt: -1 });
BlogPostSchema.index({ title: "text", excerpt: "text" });

const BlogPost =
  mongoose.models.BlogPost ||
  mongoose.model<IBlogPost>("BlogPost", BlogPostSchema);

export default BlogPost;

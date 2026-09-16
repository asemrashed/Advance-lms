import mongoose from "mongoose";

export function toSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

import { getDisplayName } from "@/lib/displayName";

function personName(user: Record<string, unknown> | null | undefined) {
  return getDisplayName(user, "Admin");
}

export function mapBlogCategory(
  category: Record<string, unknown>,
  postCount = 0,
) {
  return {
    _id: String(category._id),
    name: String(category.name || ""),
    slug: String(category.slug || ""),
    isActive: category.isActive !== false,
    postCount,
    createdAt: category.createdAt
      ? new Date(category.createdAt as string | Date).toISOString()
      : undefined,
    updatedAt: category.updatedAt
      ? new Date(category.updatedAt as string | Date).toISOString()
      : undefined,
  };
}

export function mapBlogPost(post: Record<string, unknown>) {
  const category = post.categoryId as Record<string, unknown> | string | null;
  const author = post.authorId as Record<string, unknown> | string | null;

  const categoryObj =
    category && typeof category === "object" && category._id
      ? {
          _id: String(category._id),
          name: String(category.name || ""),
          slug: String(category.slug || ""),
        }
      : null;

  const authorObj =
    author && typeof author === "object" && author._id
      ? {
          _id: String(author._id),
          name: personName(author),
          email: author.email ? String(author.email) : undefined,
        }
      : null;

  return {
    _id: String(post._id),
    title: String(post.title || ""),
    slug: String(post.slug || ""),
    excerpt: String(post.excerpt || ""),
    content: String(post.content || ""),
    thumbnailUrl: String(post.thumbnailUrl || ""),
    categoryId:
      categoryObj?._id ||
      (typeof category === "string"
        ? category
        : category && typeof category === "object"
          ? String(category._id || "")
          : String(post.categoryId || "")),
    category: categoryObj,
    authorId:
      authorObj?._id ||
      (typeof author === "string"
        ? author
        : author && typeof author === "object"
          ? String(author._id || "")
          : String(post.authorId || "")),
    author: authorObj,
    status: post.status === "published" ? "published" : "draft",
    publishedAt: post.publishedAt
      ? new Date(post.publishedAt as string | Date).toISOString()
      : null,
    isActive: post.isActive !== false,
    createdAt: post.createdAt
      ? new Date(post.createdAt as string | Date).toISOString()
      : undefined,
    updatedAt: post.updatedAt
      ? new Date(post.updatedAt as string | Date).toISOString()
      : undefined,
  };
}

export async function ensureUniqueBlogSlug(
  BlogPost: mongoose.Model<any>,
  baseSlug: string,
  excludeId?: string,
) {
  let slug = baseSlug;
  let suffix = 2;
  while (true) {
    const query: Record<string, unknown> = { slug };
    if (excludeId && mongoose.Types.ObjectId.isValid(excludeId)) {
      query._id = { $ne: excludeId };
    }
    const existing = await BlogPost.findOne(query).select("_id").lean();
    if (!existing) return slug;
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

export function isEmptyHtml(html: string) {
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .trim();
  return text.length === 0;
}

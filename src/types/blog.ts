export type BlogPostStatus = "draft" | "published";

export type BlogCategoryRow = {
  _id: string;
  name: string;
  slug: string;
  isActive: boolean;
  postCount?: number;
  createdAt?: string;
  updatedAt?: string;
};

export type BlogAuthorSummary = {
  _id: string;
  name: string;
  email?: string;
};

export type BlogCategorySummary = {
  _id: string;
  name: string;
  slug: string;
};

export type BlogPostRow = {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  thumbnailUrl: string;
  categoryId: string;
  category?: BlogCategorySummary | null;
  authorId: string;
  author?: BlogAuthorSummary | null;
  status: BlogPostStatus;
  publishedAt?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateBlogPostDto = {
  title: string;
  slug?: string;
  excerpt?: string;
  content: string;
  thumbnailUrl?: string;
  categoryId: string;
  status?: BlogPostStatus;
  isActive?: boolean;
};

export type UpdateBlogPostDto = Partial<CreateBlogPostDto>;

export type CreateBlogCategoryDto = {
  name: string;
  isActive?: boolean;
};

export type UpdateBlogCategoryDto = {
  name?: string;
  isActive?: boolean;
};

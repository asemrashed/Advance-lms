import { apiFetch } from "@/lib/api/httpClient";
import type {
  BlogCategoryRow,
  BlogPostRow,
  CreateBlogCategoryDto,
  CreateBlogPostDto,
  UpdateBlogCategoryDto,
  UpdateBlogPostDto,
} from "@/types/blog";

type ListPostsEnvelope = {
  success?: boolean;
  data?: {
    posts?: BlogPostRow[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
  error?: string;
};

type PostEnvelope = {
  success?: boolean;
  data?: { post?: BlogPostRow } | BlogPostRow;
  error?: string;
};

type ListCategoriesEnvelope = {
  success?: boolean;
  data?: {
    categories?: BlogCategoryRow[];
    pagination?: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
  error?: string;
};

type CategoryEnvelope = {
  success?: boolean;
  data?: BlogCategoryRow;
  error?: string;
};

function unwrapPost(json: PostEnvelope): BlogPostRow | undefined {
  if (!json.data) return undefined;
  if ("post" in json.data) return json.data.post;
  return json.data as BlogPostRow;
}

export const blogService = {
  async list(query = "limit=12&page=1") {
    const res = await apiFetch(`/api/blog?${query}`);
    const json = (await res.json()) as ListPostsEnvelope;
    return {
      res,
      posts: json.data?.posts ?? [],
      pagination: json.data?.pagination,
      error: json.error,
    };
  },

  async create(body: CreateBlogPostDto) {
    const res = await apiFetch("/api/blog", {
      method: "POST",
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as PostEnvelope;
    return { res, post: unwrapPost(json), error: json.error };
  },

  async update(id: string, body: UpdateBlogPostDto) {
    const res = await apiFetch(`/api/blog/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as PostEnvelope;
    return { res, post: unwrapPost(json), error: json.error };
  },

  async remove(id: string) {
    const res = await apiFetch(`/api/blog/${id}`, { method: "DELETE" });
    return res.ok;
  },
};

export const blogCategoryService = {
  async list(query = "limit=100&page=1") {
    const res = await apiFetch(`/api/blog-categories?${query}`);
    const json = (await res.json()) as ListCategoriesEnvelope;
    return {
      res,
      categories: json.data?.categories ?? [],
      pagination: json.data?.pagination,
      error: json.error,
    };
  },

  async create(body: CreateBlogCategoryDto) {
    const res = await apiFetch("/api/blog-categories", {
      method: "POST",
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as CategoryEnvelope;
    return { res, category: json.data, error: json.error };
  },

  async update(id: string, body: UpdateBlogCategoryDto) {
    const res = await apiFetch(`/api/blog-categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as CategoryEnvelope;
    return { res, category: json.data, error: json.error };
  },

  async remove(id: string) {
    const res = await apiFetch(`/api/blog-categories/${id}`, {
      method: "DELETE",
    });
    const json = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      error?: string;
    };
    return { ok: res.ok, error: json.error };
  },
};

export async function fetchPublicBlogPosts(params: {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  category?: string;
}) {
  const qs = new URLSearchParams();
  if (params.page) qs.set("page", String(params.page));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.search) qs.set("search", params.search);
  if (params.categoryId) qs.set("categoryId", params.categoryId);
  if (params.category) qs.set("category", params.category);

  const res = await fetch(`/api/public/blog?${qs.toString()}`, {
    cache: "no-store",
  });
  return (await res.json()) as ListPostsEnvelope;
}

export async function fetchPublicBlogCategories() {
  const res = await fetch("/api/public/blog-categories", { cache: "no-store" });
  return (await res.json()) as ListCategoriesEnvelope;
}

export async function fetchPublicBlogPost(slug: string) {
  const res = await fetch(`/api/public/blog/${encodeURIComponent(slug)}`, {
    cache: "no-store",
  });
  return (await res.json()) as {
    success?: boolean;
    data?: { post?: BlogPostRow; related?: BlogPostRow[] };
    error?: string;
  };
}

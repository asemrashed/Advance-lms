"use client";

import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BlogCard } from "@/components/blog/BlogCard";
import { FadeIn } from "@/components/ui/fade-in";
import {
  fetchPublicBlogCategories,
  fetchPublicBlogPosts,
} from "@/services/blogService";
import type { BlogCategoryRow, BlogPostRow } from "@/types/blog";

const PAGE_SIZE = 12;

export function BlogListClient() {
  const [posts, setPosts] = useState<BlogPostRow[]>([]);
  const [categories, setCategories] = useState<BlogCategoryRow[]>([]);
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    const res = await fetchPublicBlogCategories();
    if (res.success && res.data?.categories) {
      setCategories(res.data.categories);
    }
  }, []);

  const loadPosts = useCallback(
    async (term: string, selectedCategory: string, pageNum: number) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchPublicBlogPosts({
          page: pageNum,
          limit: PAGE_SIZE,
          search: term.trim() || undefined,
          categoryId:
            selectedCategory !== "all" ? selectedCategory : undefined,
        });
        if (res.success && res.data) {
          setPosts(res.data.posts ?? []);
          setTotalPages(res.data.pagination?.pages || 1);
        } else {
          setError("Failed to load blog posts");
          setPosts([]);
          setTotalPages(1);
        }
      } catch {
        setError("Failed to load blog posts");
        setPosts([]);
        setTotalPages(1);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadPosts(search, categoryId, page);
    }, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [loadPosts, search, categoryId, page]);

  useEffect(() => {
    setPage(1);
  }, [search, categoryId]);

  return (
    <FadeIn viewport={false} className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tight md:text-4xl">Blog</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Insights, updates, and learning tips from our team.
        </p>
      </div>

      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title, category topic…"
          className="w-full lg:max-w-sm"
          aria-label="Search blog posts"
        />
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground lg:max-w-[240px]"
          aria-label="Filter by category"
        >
          <option value="all">All categories</option>
          {categories.map((category) => (
            <option key={category._id} value={category._id}>
              {category.name}
              {typeof category.postCount === "number"
                ? ` (${category.postCount})`
                : ""}
            </option>
          ))}
        </select>
        {(search.trim() || categoryId !== "all") && (
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setSearch("");
              setCategoryId("all");
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {error ? (
        <p className="py-10 text-center text-sm text-destructive">{error}</p>
      ) : loading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-72 animate-pulse rounded-lg bg-muted/60"
            />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">
          No blog posts match your filters.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {posts.map((post) => (
            <BlogCard key={post._id} post={post} />
          ))}
        </div>
      )}

      {totalPages > 1 ? (
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      ) : null}
    </FadeIn>
  );
}

export default BlogListClient;

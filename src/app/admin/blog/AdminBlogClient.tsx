"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminRoleShell } from "@/components/role-area/AdminRoleShell";
import PageSection from "@/components/PageSection";
import WelcomeSection from "@/components/WelcomeSection";
import AdminPageWrapper from "@/components/AdminPageWrapper";
import ConfirmModal from "@/components/ui/confirm-modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BlogCard } from "@/components/blog/BlogCard";
import { BlogModal } from "@/components/blog/BlogModal";
import {
  blogCategoryService,
  blogService,
} from "@/services/blogService";
import type { BlogCategoryRow, BlogPostRow } from "@/types/blog";
import { LuPlus, LuTag, LuTrash2 } from "react-icons/lu";

const PAGE_SIZE = 12;

export default function AdminBlogClient() {
  const router = useRouter();
  const [posts, setPosts] = useState<BlogPostRow[]>([]);
  const [categories, setCategories] = useState<BlogCategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BlogPostRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BlogPostRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [editingCategory, setEditingCategory] =
    useState<BlogCategoryRow | null>(null);
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [categoryDeleteTarget, setCategoryDeleteTarget] =
    useState<BlogCategoryRow | null>(null);
  const [categoryDeleting, setCategoryDeleting] = useState(false);

  const loadCategories = useCallback(async () => {
    const { categories: rows } = await blogCategoryService.list("limit=100&page=1");
    setCategories(rows);
  }, []);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        page: String(page),
      });
      if (search.trim()) params.set("search", search.trim());
      if (categoryFilter !== "all") params.set("categoryId", categoryFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const { posts: rows, pagination } = await blogService.list(
        params.toString(),
      );
      setPosts(rows);
      setTotalPages(pagination?.pages || 1);
    } finally {
      setLoading(false);
    }
  }, [page, search, categoryFilter, statusFilter]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadPosts();
    }, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [loadPosts, search]);

  useEffect(() => {
    setPage(1);
  }, [search, categoryFilter, statusFilter]);

  const openCreate = () => {
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (post: BlogPostRow) => {
    setEditing(post);
    setModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await blogService.remove(deleteTarget._id);
      setDeleteTarget(null);
      await loadPosts();
    } finally {
      setDeleting(false);
    }
  };

  const openCreateCategory = () => {
    setEditingCategory(null);
    setCategoryName("");
    setCategoryError(null);
    setCategoryDialogOpen(true);
  };

  const openEditCategory = (category: BlogCategoryRow) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setCategoryError(null);
    setCategoryDialogOpen(true);
  };

  const saveCategory = async () => {
    const name = categoryName.trim();
    if (!name) {
      setCategoryError("Name is required");
      return;
    }
    setCategorySaving(true);
    setCategoryError(null);
    try {
      const result = editingCategory
        ? await blogCategoryService.update(editingCategory._id, { name })
        : await blogCategoryService.create({ name });
      if (!result.res.ok) {
        setCategoryError(result.error || "Failed to save category");
        return;
      }
      setCategoryDialogOpen(false);
      await loadCategories();
    } finally {
      setCategorySaving(false);
    }
  };

  const confirmDeleteCategory = async () => {
    if (!categoryDeleteTarget) return;
    setCategoryDeleting(true);
    try {
      const result = await blogCategoryService.remove(categoryDeleteTarget._id);
      if (!result.ok) {
        setCategoryError(result.error || "Failed to delete category");
      } else {
        setCategoryDeleteTarget(null);
        await loadCategories();
        if (categoryFilter === categoryDeleteTarget._id) {
          setCategoryFilter("all");
        }
      }
    } finally {
      setCategoryDeleting(false);
    }
  };

  return (
    <AdminRoleShell>
      <AdminPageWrapper>
        <WelcomeSection
          title="Blog"
          description="Create and manage blog posts and categories. Only admins can publish."
        />

        <PageSection title="Blog categories" className="mt-2">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Button type="button" onClick={openCreateCategory} className="gap-2">
              <LuTag className="h-4 w-4" />
              Add category
            </Button>
            {categoryError && !categoryDialogOpen ? (
              <p className="text-sm text-destructive">{categoryError}</p>
            ) : null}
          </div>
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No categories yet. Add one to start publishing blog posts.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <div
                  key={category._id}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-sm"
                >
                  <button
                    type="button"
                    className="font-medium hover:text-primary"
                    onClick={() => openEditCategory(category)}
                    title="Edit category"
                  >
                    {category.name}
                    {typeof category.postCount === "number" ? (
                      <span className="ml-1 text-muted-foreground">
                        ({category.postCount})
                      </span>
                    ) : null}
                  </button>
                  <button
                    type="button"
                    className="rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    title="Delete category"
                    aria-label={`Delete ${category.name}`}
                    onClick={() => {
                      setCategoryError(null);
                      setCategoryDeleteTarget(category);
                    }}
                  >
                    <LuTrash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </PageSection>

        <PageSection title="All posts" className="mt-6">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title…"
              className="lg:max-w-xs"
            />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full lg:w-[200px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category._id} value={category._id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" onClick={openCreate} className="gap-2 lg:ml-auto">
              <LuPlus className="h-4 w-4" />
              New post
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-72 animate-pulse rounded-lg bg-muted/60"
                />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No blog posts found.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {posts.map((post) => (
                <BlogCard
                  key={post._id}
                  post={post}
                  actions={{
                    onEdit: openEdit,
                    onDelete: setDeleteTarget,
                    onView: (row) => router.push(`/blog/${row.slug}`),
                  }}
                />
              ))}
            </div>
          )}

          {totalPages > 1 ? (
            <div className="mt-6 flex items-center justify-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
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
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          ) : null}
        </PageSection>

        <BlogModal
          open={modalOpen}
          post={editing}
          categories={categories}
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            void loadPosts();
            void loadCategories();
          }}
        />

        <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? "Edit category" : "Add category"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <Input
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                placeholder="Category name"
                autoFocus
              />
              {categoryError ? (
                <p className="text-sm text-destructive">{categoryError}</p>
              ) : null}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setCategoryDialogOpen(false)}
                disabled={categorySaving}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={() => void saveCategory()}
                disabled={categorySaving}
              >
                {categorySaving ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ConfirmModal
          open={Boolean(deleteTarget)}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => void confirmDelete()}
          title="Delete blog post?"
          description={
            deleteTarget
              ? `Delete “${deleteTarget.title}”? This cannot be undone.`
              : undefined
          }
          confirmText="Delete"
          variant="danger"
          loading={deleting}
        />

        <ConfirmModal
          open={Boolean(categoryDeleteTarget)}
          onClose={() => setCategoryDeleteTarget(null)}
          onConfirm={() => void confirmDeleteCategory()}
          title="Delete category?"
          description={
            categoryDeleteTarget
              ? `Delete “${categoryDeleteTarget.name}”? Categories with posts cannot be deleted.`
              : undefined
          }
          confirmText="Delete"
          variant="danger"
          loading={categoryDeleting}
        />
      </AdminPageWrapper>
    </AdminRoleShell>
  );
}

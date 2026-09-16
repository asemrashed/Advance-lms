"use client";

import { FormEvent, useEffect, useState } from "react";
import FormModal from "@/components/ui/form-modal";
import { AttractiveInput } from "@/components/ui/attractive-input";
import { AttractiveTextarea } from "@/components/ui/attractive-textarea";
import TipTapEditor from "@/components/ui/TipTapEditor";
import { ImageSourceField } from "@/components/ui/ImageSourceField";
import { UPLOAD_ENDPOINTS } from "@/lib/uploadImage";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { blogService } from "@/services/blogService";
import type {
  BlogCategoryRow,
  BlogPostRow,
  BlogPostStatus,
} from "@/types/blog";

type BlogModalProps = {
  open: boolean;
  post?: BlogPostRow | null;
  categories: BlogCategoryRow[];
  onClose: () => void;
  onSuccess: () => void;
};

const emptyForm = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  thumbnailUrl: "",
  categoryId: "",
  status: "draft" as BlogPostStatus,
  isActive: true,
};

export function BlogModal({
  open,
  post,
  categories,
  onClose,
  onSuccess,
}: BlogModalProps) {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (post) {
      setForm({
        title: post.title || "",
        slug: post.slug || "",
        excerpt: post.excerpt || "",
        content: post.content || "",
        thumbnailUrl: post.thumbnailUrl || "",
        categoryId: post.categoryId || post.category?._id || "",
        status: post.status || "draft",
        isActive: post.isActive !== false,
      });
    } else {
      setForm({
        ...emptyForm,
        categoryId: categories.find((c) => c.isActive)?._id || "",
      });
    }
    setError(null);
  }, [open, post, categories]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.title.trim()) {
      setError("Title is required");
      return;
    }
    if (!form.categoryId) {
      setError("Please select a category");
      return;
    }
    if (!form.content.trim() || form.content === "<p></p>") {
      setError("Content is required");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        title: form.title.trim(),
        slug: form.slug.trim() || undefined,
        excerpt: form.excerpt.trim(),
        content: form.content,
        thumbnailUrl: form.thumbnailUrl.trim(),
        categoryId: form.categoryId,
        status: form.status,
        isActive: form.isActive,
      };

      const result = post
        ? await blogService.update(post._id, payload)
        : await blogService.create(payload);

      if (!result.res.ok) {
        setError(result.error || "Failed to save blog post");
        return;
      }

      onSuccess();
      onClose();
    } catch {
      setError("Failed to save blog post");
    } finally {
      setLoading(false);
    }
  };

  const activeCategories = categories.filter((c) => c.isActive !== false);
  const categoryOptions =
    post?.categoryId &&
    !activeCategories.some((c) => c._id === post.categoryId)
      ? [
          ...activeCategories,
          {
            _id: post.categoryId,
            name: post.category?.name || "Current category",
            slug: post.category?.slug || "",
            isActive: true,
          },
        ]
      : activeCategories;

  return (
    <FormModal
      open={open}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={post ? "Edit blog post" : "New blog post"}
      description="Only admins can publish blog posts. Use TipTap to write rich content."
      submitText={post ? "Update post" : "Create post"}
      loading={loading}
      size="2xl"
    >
      <div className="space-y-4">
        {error ? (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <AttractiveInput
          label="Title"
          value={form.title}
          onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          placeholder="Post title"
          disabled={loading}
          required
        />

        <AttractiveInput
          label="Slug (optional)"
          value={form.slug}
          onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
          placeholder="auto-generated-from-title"
          disabled={loading}
          helperText="Leave blank to generate from the title"
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Category</label>
            <Select
              value={form.categoryId || undefined}
              onValueChange={(value) =>
                setForm((f) => ({ ...f, categoryId: value }))
              }
              disabled={loading || categoryOptions.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((category) => (
                  <SelectItem key={category._id} value={category._id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {categoryOptions.length === 0 ? (
              <p className="text-xs text-amber-600">
                Add a blog category first before creating a post.
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select
              value={form.status}
              onValueChange={(value) =>
                setForm((f) => ({
                  ...f,
                  status: value as BlogPostStatus,
                }))
              }
              disabled={loading}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <AttractiveTextarea
          label="Excerpt"
          value={form.excerpt}
          onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))}
          placeholder="Short summary shown on blog cards"
          disabled={loading}
          rows={3}
        />

        <ImageSourceField
          label="Thumbnail"
          value={form.thumbnailUrl}
          onChange={(url) => setForm((f) => ({ ...f, thumbnailUrl: url }))}
          uploadEndpoint={UPLOAD_ENDPOINTS.cmsImage}
          disabled={loading}
          hint="Shown on cards and on the blog detail sidebar."
        />

        <div className="space-y-2">
          <label className="text-sm font-medium">Content</label>
          <TipTapEditor
            variant="blog"
            value={form.content}
            onChange={(html) => setForm((f) => ({ ...f, content: html }))}
            placeholder="Write your blog post…"
            minHeight="260px"
            disabled={loading}
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={form.isActive}
            onCheckedChange={(checked) =>
              setForm((f) => ({ ...f, isActive: checked === true }))
            }
            disabled={loading}
          />
          Active (visible when published)
        </label>
      </div>
    </FormModal>
  );
}

export default BlogModal;

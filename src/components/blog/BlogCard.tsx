"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";
import type { BlogPostRow } from "@/types/blog";
import { LuPencil, LuTrash2, LuEye } from "react-icons/lu";
import { Button } from "@/components/ui/button";

export type BlogCardActions = {
  onEdit?: (post: BlogPostRow) => void;
  onDelete?: (post: BlogPostRow) => void;
  onView?: (post: BlogPostRow) => void;
};

type BlogCardProps = {
  post: BlogPostRow;
  href?: string;
  className?: string;
  actions?: BlogCardActions;
};

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function BlogCard({ post, href, className, actions }: BlogCardProps) {
  const [imageError, setImageError] = useState(false);
  const imageSrc = post.thumbnailUrl?.trim() || "";
  const showImage = Boolean(imageSrc) && !imageError;
  const targetHref = href || `/blog/${post.slug}`;
  const dateLabel = formatDate(post.publishedAt || post.createdAt);
  const categoryName = post.category?.name;
  const hasAdminActions = Boolean(
    actions?.onEdit || actions?.onDelete || actions?.onView,
  );

  const body = (
    <>
      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-lg">
        {showImage ? (
          <Image
            src={imageSrc}
            alt={post.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 33vw"
            onError={() => setImageError(true)}
            unoptimized={imageSrc.startsWith("/uploads/")}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900 text-sm font-medium text-white/70">
            Blog
          </div>
        )}
        {categoryName ? (
          <span className="absolute left-3 top-3 rounded-md bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-on-primary md:text-xs">
            {categoryName}
          </span>
        ) : null}
        {hasAdminActions && post.status === "draft" ? (
          <span className="absolute right-3 top-3 rounded-md bg-amber-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white md:text-xs">
            Draft
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 pt-1">
        <h3 className="line-clamp-2 text-base font-extrabold leading-snug text-foreground sm:text-lg">
          {post.title}
        </h3>
        {post.excerpt ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {post.excerpt}
          </p>
        ) : null}
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-outline-variant/20 pt-2 text-xs text-muted-foreground">
          <span>{dateLabel || "—"}</span>
          {post.author?.name ? <span>{post.author.name}</span> : null}
        </div>
      </div>
    </>
  );

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col gap-3 rounded-lg bg-surface-container p-4 shadow-md transition-all duration-300 hover:shadow-lg hover:shadow-primary/30",
        className,
      )}
    >
      {hasAdminActions ? (
        <div className="flex h-full flex-col gap-3">{body}</div>
      ) : (
        <Link href={targetHref} className="flex h-full flex-col gap-3">
          {body}
        </Link>
      )}

      {hasAdminActions ? (
        <div className="flex items-center gap-1 border-t border-outline-variant/20 pt-3">
          {actions?.onView ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              title="View"
              aria-label="View post"
              onClick={() => actions.onView?.(post)}
            >
              <LuEye className="h-4 w-4" />
            </Button>
          ) : null}
          {actions?.onEdit ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              title="Edit"
              aria-label="Edit post"
              onClick={() => actions.onEdit?.(post)}
            >
              <LuPencil className="h-4 w-4" />
            </Button>
          ) : null}
          {actions?.onDelete ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
              title="Delete"
              aria-label="Delete post"
              onClick={() => actions.onDelete?.(post)}
            >
              <LuTrash2 className="h-4 w-4" />
            </Button>
          ) : null}
          {post.status === "published" && post.isActive !== false ? (
            <Link
              href={targetHref}
              className="ml-auto text-xs font-semibold text-primary hover:underline"
            >
              Open
            </Link>
          ) : (
            <span className="ml-auto text-xs text-muted-foreground">Draft</span>
          )}
        </div>
      ) : null}
    </article>
  );
}

export default BlogCard;

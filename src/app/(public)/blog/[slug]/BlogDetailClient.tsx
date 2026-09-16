"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { BlogCard } from "@/components/blog/BlogCard";
import { FadeIn } from "@/components/ui/fade-in";
import { cn } from "@/lib/cn";
import { fetchPublicBlogPost } from "@/services/blogService";
import type { BlogPostRow } from "@/types/blog";
import { RichHtml } from "@/components/ui/MathText";

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function BlogThumbnail({
  title,
  thumbnail,
  imageError,
  onImageError,
  priority = false,
  variant = "sidebar",
}: {
  title: string;
  thumbnail: string;
  imageError: boolean;
  onImageError: () => void;
  priority?: boolean;
  variant?: "mobile" | "sidebar";
}) {
  const showThumb = Boolean(thumbnail) && !imageError;
  const aspectClass =
    variant === "mobile" ? "aspect-video max-h-56 sm:max-h-none" : "aspect-[4/3]";

  return (
    <div className="overflow-hidden rounded-lg bg-surface-container shadow-md">
      <div className={cn("relative w-full", aspectClass)}>
        {showThumb ? (
          <Image
            src={thumbnail}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 340px"
            priority={priority}
            unoptimized={thumbnail.startsWith("/uploads/")}
            onError={onImageError}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-700 to-slate-900 text-sm text-white/70">
            Blog
          </div>
        )}
      </div>
    </div>
  );
}

function RelatedPosts({
  posts,
  className = "",
  showHeading = true,
  variant = "stack",
}: {
  posts: BlogPostRow[];
  className?: string;
  showHeading?: boolean;
  variant?: "stack" | "grid";
}) {
  if (posts.length === 0) return null;

  return (
    <div className={className}>
      {showHeading ? (
        <h2 className="mb-3 text-lg font-extrabold">Related posts</h2>
      ) : null}
      <div
        className={
          variant === "grid"
            ? "grid grid-cols-2 gap-3"
            : "space-y-4"
        }
      >
        {posts.map((row) => (
          <BlogCard key={row._id} post={row} />
        ))}
      </div>
    </div>
  );
}

export function BlogDetailClient() {
  const params = useParams();
  const slug = String(params?.slug || "");
  const [post, setPost] = useState<BlogPostRow | null>(null);
  const [related, setRelated] = useState<BlogPostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setImageError(false);
      try {
        const res = await fetchPublicBlogPost(slug);
        if (cancelled) return;
        if (res.success && res.data?.post) {
          setPost(res.data.post);
          setRelated(res.data.related ?? []);
        } else {
          setPost(null);
          setRelated([]);
          setError(res.error || "Blog post not found");
        }
      } catch {
        if (!cancelled) {
          setError("Failed to load blog post");
          setPost(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-10 md:px-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="h-[28rem] animate-pulse rounded-lg bg-muted/60" />
          <div className="space-y-4">
            <div className="h-48 animate-pulse rounded-lg bg-muted/60" />
            <div className="h-64 animate-pulse rounded-lg bg-muted/60" />
            <div className="h-64 animate-pulse rounded-lg bg-muted/60" />
            <div className="h-64 animate-pulse rounded-lg bg-muted/60" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Post not found</h1>
        <p className="mt-2 text-muted-foreground">
          {error || "This blog post is unavailable."}
        </p>
        <Link
          href="/blog"
          className="mt-6 inline-block font-semibold text-primary hover:underline"
        >
          Back to blog
        </Link>
      </div>
    );
  }

  const dateLabel = formatDate(post.publishedAt || post.createdAt);
  const thumbnail = post.thumbnailUrl?.trim() || "";
  const sidebarRelated = related.slice(0, 3);

  return (
    <FadeIn
      viewport={false}
      className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6 md:py-10"
    >
      <div className="mb-6 text-sm text-muted-foreground">
        <Link href="/blog" className="hover:text-primary hover:underline">
          Blog
        </Link>
        {post.category?.name ? (
          <>
            <span className="mx-2">/</span>
            <span>{post.category.name}</span>
          </>
        ) : null}
      </div>

      <div className="mb-6 lg:hidden">
        <BlogThumbnail
          title={post.title}
          thumbnail={thumbnail}
          imageError={imageError}
          onImageError={() => setImageError(true)}
          priority
          variant="mobile"
        />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_300px] xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-10">
        <article className="min-w-0">
          <header className="mb-6">
            {post.category?.name ? (
              <span className="inline-block rounded-md bg-primary/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-primary">
                {post.category.name}
              </span>
            ) : null}
            <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl lg:text-5xl">
              {post.title}
            </h1>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {dateLabel ? <span>{dateLabel}</span> : null}
              {post.author?.name ? <span>By {post.author.name}</span> : null}
            </div>
          </header>

          {post.excerpt ? (
            <p className="mb-6 text-lg leading-relaxed text-muted-foreground">
              {post.excerpt}
            </p>
          ) : null}

          <RichHtml
            className="tiptap-course-description blog-content text-base leading-relaxed text-foreground"
            html={post.content}
          />
        </article>

        <aside className="hidden space-y-4 lg:block lg:sticky lg:top-28 lg:self-start">
          <BlogThumbnail
            title={post.title}
            thumbnail={thumbnail}
            imageError={imageError}
            onImageError={() => setImageError(true)}
            priority
            variant="sidebar"
          />
          {sidebarRelated.length > 0 ? (
            <RelatedPosts posts={sidebarRelated} showHeading={false} />
          ) : null}
        </aside>
      </div>

      {related.length > 0 ? (
        <RelatedPosts posts={related} className="mt-8 lg:hidden" variant="grid" />
      ) : null}
    </FadeIn>
  );
}

export default BlogDetailClient;

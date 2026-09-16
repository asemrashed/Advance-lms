"use client";

import { useEffect, useMemo, useState } from "react";
import { BlogCard } from "@/components/blog/BlogCard";
import { StaggerContainer, StaggerItem } from "@/components/ui/fade-in";
import ViewAllPillButton from "@/components/ui/buttons/ViewAllPillButton";
import { fetchPublicBlogPosts } from "@/services/blogService";
import type { BlogContent } from "@/lib/websiteContentTypes";
import type { BlogPostRow } from "@/types/blog";

const MAX_CARDS = 3;

export function HomeBlogSection({ content }: { content?: BlogContent | null }) {
  const [posts, setPosts] = useState<BlogPostRow[]>([]);
  const [loading, setLoading] = useState(true);

  const titlePart1 = content?.title?.part1?.trim() || "Latest";
  const titlePart2 = content?.title?.part2?.trim() || "insights";
  const description =
    content?.description?.trim() ||
    "Stay up to date with tips, tutorials, and news from our learning community.";
  const buttonText = content?.buttonText?.trim() || "View more";
  const buttonHref = content?.buttonHref?.trim() || "/blog";
  const featuredIds = content?.featuredPostIds ?? [];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await fetchPublicBlogPosts({ limit: 12, page: 1 });
      if (!cancelled && res.success && res.data?.posts) {
        setPosts(res.data.posts);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const featuredPosts = useMemo(() => {
    const byId = new Map(posts.map((p) => [p._id, p]));
    const ordered: BlogPostRow[] = [];

    if (featuredIds.length > 0) {
      for (const id of featuredIds) {
        const row = byId.get(String(id));
        if (row && !ordered.some((p) => p._id === row._id)) {
          ordered.push(row);
        }
      }
      return ordered.slice(0, MAX_CARDS);
    }

    return posts.slice(0, MAX_CARDS);
  }, [posts, featuredIds]);

  const header = (
    <div className="mb-16 flex flex-col items-end justify-between gap-8 md:flex-row">
      <div className="max-w-2xl">
        <h2 className="mb-4 font-[family-name:var(--font-headline)] text-5xl font-extrabold tracking-tight text-foreground">
          {titlePart1}{" "}
          <span className="text-primary">{titlePart2}</span>
        </h2>
        <p className="text-lg leading-relaxed text-muted-foreground">{description}</p>
      </div>
      <ViewAllPillButton href={buttonHref}>{buttonText}</ViewAllPillButton>
    </div>
  );

  if (!loading && featuredPosts.length === 0) {
    return (
      <section id="blog" className="px-8 py-24">
        <div className="mx-auto max-w-screen-2xl">
          {header}
          <p className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
            No blog posts yet. Check back soon.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section id="blog" className="px-8 py-24">
      <div className="mx-auto max-w-screen-2xl">
        {header}

        {loading ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={`blog-skeleton-${i}`}
                className="h-80 animate-pulse rounded-lg bg-muted"
              />
            ))}
          </div>
        ) : (
          <StaggerContainer
            viewport={false}
            className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8"
          >
            {featuredPosts.map((post) => (
              <StaggerItem key={post._id}>
                <BlogCard post={post} />
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}
      </div>
    </section>
  );
}

export default HomeBlogSection;

'use client';

import { useEffect, useMemo, useState } from 'react';
import type { WebsiteContent } from './types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AttractiveInput } from '@/components/ui/attractive-input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  LuFileText as FileText,
  LuArrowUp,
  LuArrowDown,
  LuSearch as Search,
  LuLoader as Loader2,
  LuPlus as Plus,
  LuX as X,
} from 'react-icons/lu';
import { blogService } from '@/services/blogService';
import type { BlogPostRow } from '@/types/blog';

interface BlogSectionProps {
  content: WebsiteContent;
  updateContent: (path: string[], value: unknown) => void;
  addFeaturedPost: (postId: string) => void;
  removeFeaturedPost: (postId: string) => void;
  moveFeaturedPost: (postId: string, direction: 'up' | 'down') => void;
}

const MAX_HOME_POSTS = 3;

function formatDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function BlogSection({
  content,
  updateContent,
  addFeaturedPost,
  removeFeaturedPost,
  moveFeaturedPost,
}: BlogSectionProps) {
  const [posts, setPosts] = useState<BlogPostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const featuredIds: string[] = content.blog?.featuredPostIds ?? [];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { res, posts: rows } = await blogService.list('limit=50&page=1');
        if (!cancelled && res.ok) {
          setPosts(rows ?? []);
        } else if (!cancelled) {
          setPosts([]);
        }
      } catch {
        if (!cancelled) setPosts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredPosts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter(
      (post) =>
        post.title.toLowerCase().includes(q) ||
        post.slug.toLowerCase().includes(q) ||
        post.category?.name?.toLowerCase().includes(q),
    );
  }, [posts, search]);

  const canAddToHome = (post: BlogPostRow) =>
    post.status === 'published' &&
    post.isActive !== false &&
    !featuredIds.includes(post._id) &&
    featuredIds.length < MAX_HOME_POSTS;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Home — Blog
        </CardTitle>
        <CardDescription>
          Choose up to {MAX_HOME_POSTS} published posts for the home page. Create and edit posts in
          Blog admin — this page only controls which posts appear on the homepage.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold">Heading (line 1)</label>
            <AttractiveInput
              value={content.blog?.title?.part1 ?? ''}
              onChange={(e) => updateContent(['blog', 'title', 'part1'], e.target.value)}
              placeholder="Latest"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold">Heading highlight (line 2)</label>
            <AttractiveInput
              value={content.blog?.title?.part2 ?? ''}
              onChange={(e) => updateContent(['blog', 'title', 'part2'], e.target.value)}
              placeholder="insights"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">Description</label>
          <textarea
            className="flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm"
            value={content.blog?.description ?? ''}
            onChange={(e) => updateContent(['blog', 'description'], e.target.value)}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold">View more button text</label>
            <Input
              value={content.blog?.buttonText ?? ''}
              onChange={(e) => updateContent(['blog', 'buttonText'], e.target.value)}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold">View more link</label>
            <Input
              value={content.blog?.buttonHref ?? ''}
              onChange={(e) => updateContent(['blog', 'buttonHref'], e.target.value)}
              placeholder="/blog"
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-sm font-semibold">Homepage posts</label>
            <Badge variant="outline">
              {featuredIds.length}/{MAX_HOME_POSTS} selected
            </Badge>
          </div>

          {featuredIds.length > 0 && (
            <div className="rounded-lg border border-green-200 bg-green-50/40 p-3">
              <p className="mb-2 text-xs font-medium text-gray-600">Selected for homepage (in order)</p>
              <div className="space-y-2">
                {featuredIds.map((id, index) => {
                  const post = posts.find((p) => p._id === id);
                  return (
                    <div
                      key={id}
                      className="flex items-center justify-between gap-2 rounded-md border border-green-100 bg-white px-3 py-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <Badge variant="secondary" className="shrink-0">
                          {index + 1}
                        </Badge>
                        <span className="truncate text-sm font-medium text-gray-900">
                          {post?.title ?? id}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          disabled={index === 0}
                          onClick={() => moveFeaturedPost(id, 'up')}
                        >
                          <LuArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-8 w-8"
                          disabled={index === featuredIds.length - 1}
                          onClick={() => moveFeaturedPost(id, 'down')}
                        >
                          <LuArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => removeFeaturedPost(id)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {featuredIds.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No posts selected — the {MAX_HOME_POSTS} most recent published posts will appear on the
              home page.
            </p>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              className="pl-9"
              placeholder="Search posts by title, slug, or category…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading blog posts…
            </div>
          ) : filteredPosts.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">
              {posts.length === 0
                ? 'No blog posts yet. Create posts in Blog admin first.'
                : 'No posts match your search.'}
            </p>
          ) : (
            <div className="max-h-[28rem] space-y-2 overflow-y-auto rounded-lg border border-gray-200 p-3 pr-1">
              {filteredPosts.map((post) => {
                const isSelected = featuredIds.includes(post._id);
                const selectedIndex = featuredIds.indexOf(post._id);
                const isPublished = post.status === 'published' && post.isActive !== false;
                const dateLabel = formatDate(post.publishedAt || post.createdAt);

                return (
                  <div
                    key={post._id}
                    className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5 ${
                      isSelected ? 'border-green-200 bg-green-50/40' : 'border-gray-100'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-sm font-medium text-gray-900">
                          {post.title}
                        </span>
                        {isSelected ? (
                          <Badge className="bg-green-600 text-white hover:bg-green-600">
                            On home #{selectedIndex + 1}
                          </Badge>
                        ) : null}
                        {post.status === 'draft' ? (
                          <Badge variant="outline" className="text-xs">
                            Draft
                          </Badge>
                        ) : null}
                        {post.isActive === false ? (
                          <Badge variant="outline" className="text-xs text-amber-700">
                            Inactive
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {[post.category?.name, dateLabel].filter(Boolean).join(' · ') || post.slug}
                      </p>
                    </div>

                    {isSelected ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="shrink-0 text-destructive hover:text-destructive"
                        onClick={() => removeFeaturedPost(post._id)}
                      >
                        <X className="mr-1 h-3.5 w-3.5" />
                        Remove
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="default"
                        className="shrink-0"
                        disabled={!canAddToHome(post)}
                        title={
                          !isPublished
                            ? 'Only published, active posts can appear on the home page'
                            : featuredIds.length >= MAX_HOME_POSTS
                              ? `Maximum ${MAX_HOME_POSTS} posts on home page`
                              : 'Add to homepage'
                        }
                        onClick={() => addFeaturedPost(post._id)}
                      >
                        <Plus className="mr-1 h-3.5 w-3.5" />
                        Add to home
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

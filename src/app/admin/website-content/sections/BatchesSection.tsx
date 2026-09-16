'use client';

import type { WebsiteContent } from './types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { AttractiveInput } from '@/components/ui/attractive-input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LuBriefcase as Briefcase, LuArrowUp, LuArrowDown, LuTrash2 as Trash } from 'react-icons/lu';

type BatchListItem = { _id: string; name: string };

interface BatchesSectionProps {
  content: WebsiteContent;
  updateContent: (path: string[], value: unknown) => void;
  publishedBatchesList: BatchListItem[];
  addFeaturedBatch: (batchId: string) => void;
  removeFeaturedBatch: (batchId: string) => void;
  moveFeaturedBatch: (batchId: string, direction: 'up' | 'down') => void;
}

export function BatchesSection({
  content,
  updateContent,
  publishedBatchesList,
  addFeaturedBatch,
  removeFeaturedBatch,
  moveFeaturedBatch,
}: BatchesSectionProps) {
  const featuredIds: string[] = content.batches?.featuredBatchIds ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          Home — Featured Batches
        </CardTitle>
        <CardDescription>
          Shown on the home page before featured courses (up to 4 cards). &quot;View all&quot; links
          to public enroll.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold">Heading (line 1)</label>
            <AttractiveInput
              value={content.batches?.title?.part1 ?? ''}
              onChange={(e) => updateContent(['batches', 'title', 'part1'], e.target.value)}
              placeholder="Live batch"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold">Heading highlight (line 2)</label>
            <AttractiveInput
              value={content.batches?.title?.part2 ?? ''}
              onChange={(e) => updateContent(['batches', 'title', 'part2'], e.target.value)}
              placeholder="enrollment"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">Description</label>
          <textarea
            className="flex min-h-[80px] w-full rounded-md border px-3 py-2 text-sm"
            value={content.batches?.description ?? ''}
            onChange={(e) => updateContent(['batches', 'description'], e.target.value)}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-semibold">View all button text</label>
            <Input
              value={content.batches?.buttonText ?? ''}
              onChange={(e) => updateContent(['batches', 'buttonText'], e.target.value)}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold">View all link</label>
            <Input
              value={content.batches?.buttonHref ?? ''}
              onChange={(e) => updateContent(['batches', 'buttonHref'], e.target.value)}
              placeholder="/enroll"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold">
            Featured batches (homepage card order)
          </label>
          <p className="mb-3 text-xs text-muted-foreground">
            Pick up to 4 active public batches. Others fill remaining slots automatically.
          </p>

          {featuredIds.length > 0 && (
            <ul className="mb-4 space-y-2">
              {featuredIds.map((id, index) => {
                const batch = publishedBatchesList.find((b) => b._id === id);
                return (
                  <li
                    key={id}
                    className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
                  >
                    <span className="text-sm font-medium">
                      {batch?.name ?? id}
                      <Badge variant="secondary" className="ml-2">
                        #{index + 1}
                      </Badge>
                    </span>
                    <div className="flex gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        disabled={index === 0}
                        onClick={() => moveFeaturedBatch(id, 'up')}
                      >
                        <LuArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        disabled={index === featuredIds.length - 1}
                        onClick={() => moveFeaturedBatch(id, 'down')}
                      >
                        <LuArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => removeFeaturedBatch(id)}
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <select
            className="flex h-9 w-full max-w-md rounded-md border bg-background px-3 text-sm"
            defaultValue=""
            onChange={(e) => {
              const v = e.target.value;
              if (v) addFeaturedBatch(v);
              e.target.value = '';
            }}
          >
            <option value="">Add batch to featured list…</option>
            {publishedBatchesList
              .filter((b) => !featuredIds.includes(b._id))
              .map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
          </select>
        </div>
      </CardContent>
    </Card>
  );
}

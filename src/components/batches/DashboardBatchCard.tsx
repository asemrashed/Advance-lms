'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';

export type DashboardBatchCardData = {
  _id: string;
  courseId?: string;
  name: string;
  grade?: string;
  shortDescription?: string;
  thumbnailUrl?: string;
  fee?: number;
  enrolledCount: number;
  maxStudents: number;
};

export function DashboardBatchCard({
  batch,
  manageHref,
  className,
}: {
  batch: DashboardBatchCardData;
  manageHref: string;
  className?: string;
}) {
  const isFree = (batch.fee ?? 0) <= 0;
  const seatsLabel = `${batch.enrolledCount} / ${batch.maxStudents} enrolled`;
  const imageSrc = batch.thumbnailUrl?.trim() || '';

  return (
    <article
      className={cn(
        'flex flex-col overflow-hidden rounded-lg border border-border',
        className,
      )}
    >
      <div className="relative h-40 w-full shrink-0 overflow-hidden">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={batch.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        ) : (
          <div className="flex h-full items-center justify-center border-b text-sm text-muted-foreground">
            No cover
          </div>
        )}
        {batch.grade ? (
          <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-on-primary">
            Grade {batch.grade}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-base font-bold leading-snug text-foreground">
          {batch.name}
        </h3>
        {batch.shortDescription ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {batch.shortDescription}
          </p>
        ) : null}

        <div className="mt-auto space-y-2 pt-2">
          <p className="text-lg font-black text-primary">
            {!isFree && <span className="mr-0.5 text-xl">৳</span>}
            {isFree ? 'Free' : (batch.fee ?? 0).toLocaleString()}
          </p>
          <p className="text-sm font-medium text-muted-foreground">{seatsLabel}</p>

          <div className="flex flex-wrap gap-2 pt-1">
            <Button asChild size="sm" className="flex-1 min-w-[7rem]">
              <Link href={manageHref}>Manage</Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="flex-1 min-w-[7rem]">
              <Link
                href={
                  batch.courseId
                    ? `/enroll/course/${batch.courseId}`
                    : `/enroll/${batch._id}`
                }
                target="_blank"
                rel="noopener noreferrer"
              >
                Public
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

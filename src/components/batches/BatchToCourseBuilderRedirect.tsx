'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { batchesService } from '@/services/batchesService';
import { LuLoader as Loader2 } from 'react-icons/lu';

type BatchToMaterialsRedirectProps = {
  batchId: string;
  role: 'admin' | 'instructor';
};

/** Legacy batch detail URLs → curriculum materials. */
export function BatchToCourseBuilderRedirect({
  batchId,
  role,
}: BatchToMaterialsRedirectProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const coursesHref = role === 'admin' ? '/admin/courses' : '/instructor/courses';
  const materialsBase =
    role === 'admin' ? '/admin/materials' : '/instructor/materials';

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await batchesService.getBatch(batchId);
        if (cancelled) return;
        const courseId = res.data?.batch?.courseId;
        if (courseId) {
          const params = new URLSearchParams({
            courseId: String(courseId),
            batchId,
          });
          router.replace(`${materialsBase}?${params.toString()}`);
          return;
        }
        router.replace(coursesHref);
      } catch {
        if (!cancelled) setError('Could not load batch');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [batchId, materialsBase, coursesHref, router]);

  if (error) {
    return (
      <p className="p-6 text-sm text-destructive">
        {error}.{' '}
        <button
          type="button"
          className="underline"
          onClick={() => router.push(coursesHref)}
        >
          Go to courses
        </button>
      </p>
    );
  }

  return (
    <div className="flex items-center justify-center gap-2 p-12 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
      Opening curriculum builder…
    </div>
  );
}

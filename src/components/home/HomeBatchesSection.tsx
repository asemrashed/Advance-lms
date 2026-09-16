'use client';

import { useEffect, useMemo, useState } from 'react';
import ViewAllPillButton from '@/components/ui/buttons/ViewAllPillButton';
import CourseCard from '@/components/CourseCard';
import { CourseCardSkeleton } from '@/components/skeletons/CourseCardSkeleton';
import { StaggerContainer, StaggerItem } from '@/components/ui/fade-in';
import type { BatchesContent } from '@/lib/websiteContentTypes';
import { mapLiveCourseRowToCard } from '@/lib/publicCourseCard';
import {
  publicLiveCoursesService,
  type PublicLiveCourseRow,
} from '@/services/publicLiveCoursesService';

const MAX_CARDS = 4;

export function HomeBatchesSection({ content }: { content?: BatchesContent | null }) {
  const [courses, setCourses] = useState<PublicLiveCourseRow[]>([]);
  const [loading, setLoading] = useState(true);

  const titlePart1 = content?.title?.part1?.trim() || 'Live';
  const titlePart2 = content?.title?.part2?.trim() || 'courses';
  const description =
    content?.description?.trim() ||
    'Enroll in live courses with instructor-led sessions, then pick a batch section that fits your schedule.';
  const buttonText = content?.buttonText?.trim() || 'View all';
  const buttonHref = content?.buttonHref?.trim() || '/enroll';
  const featuredIds = content?.featuredBatchIds ?? [];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await publicLiveCoursesService.listLiveCourses({ limit: 20 });
      if (!cancelled && res.success && res.data) {
        setCourses(res.data.courses);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const featuredCourses = useMemo(() => {
    const byId = new Map(courses.map((c) => [c._id, c]));
    const picked = new Set<string>();
    const ordered: PublicLiveCourseRow[] = [];

    for (const id of featuredIds) {
      const row = byId.get(String(id));
      if (row && !picked.has(row._id)) {
        picked.add(row._id);
        ordered.push(row);
      }
    }
    for (const row of courses) {
      if (ordered.length >= MAX_CARDS) break;
      if (!picked.has(row._id)) {
        picked.add(row._id);
        ordered.push(row);
      }
    }
    return ordered.slice(0, MAX_CARDS);
  }, [courses, featuredIds]);

  if (!loading && featuredCourses.length === 0) {
    return (
      <section id="batches" className="px-4 py-12 sm:px-6 md:px-8 md:py-24">
        <div className="mx-auto max-w-screen-2xl">
          <div className="mb-8 flex flex-col items-start justify-between gap-6 sm:mb-12 md:mb-16 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <h2 className="mb-4 font-[family-name:var(--font-headline)] text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl">
                {titlePart1}{' '}
                <span className="text-primary">{titlePart2}</span>
              </h2>
              <p className="text-lg leading-relaxed text-muted-foreground">{description}</p>
            </div>
            <ViewAllPillButton href={buttonHref}>{buttonText}</ViewAllPillButton>
          </div>
          <p className="rounded-xl border border-dashed p-12 text-center text-muted-foreground">
            No live courses available yet. Check back soon.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section id="batches" className="px-4 py-12 sm:px-6 md:px-8 md:py-24">
      <div className="mx-auto max-w-screen-2xl">
        <div className="mb-8 flex flex-col items-start justify-between gap-6 sm:mb-12 md:mb-16 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <h2 className="mb-4 font-[family-name:var(--font-headline)] text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl md:text-5xl">
              {titlePart1}{' '}
              <span className="text-primary">{titlePart2}</span>
            </h2>
            <p className="text-base leading-relaxed text-muted-foreground md:text-lg">{description}</p>
          </div>
          <ViewAllPillButton href={buttonHref}>{buttonText}</ViewAllPillButton>
        </div>

        {loading ? (
          <StaggerContainer viewport={false} className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4 lg:gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <StaggerItem key={`skeleton-${i}`}>
                <CourseCardSkeleton />
              </StaggerItem>
            ))}
          </StaggerContainer>
        ) : (
          <StaggerContainer viewport={false} className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4 lg:gap-6">
            {featuredCourses.map((course, i) => (
              <StaggerItem key={course._id}>
                <CourseCard course={mapLiveCourseRowToCard(course)} index={i} />
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}
      </div>
    </section>
  );
}

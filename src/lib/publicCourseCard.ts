import type { PublicLiveCourseRow } from '@/services/publicLiveCoursesService';
import type { PublicCourseRow } from '@/types/public-course';

/** Map a public catalog row to the shared CourseCard shape. */
export function mapPublicCourseRowToCard(
  c: PublicCourseRow,
  hrefPrefix: '/course' | '/enroll/course' = '/course',
) {
  const fullFee = c.finalPrice ?? c.price ?? 0;
  const hasMonthlyFee =
    c.courseType === 'live' &&
    typeof c.monthlyPrice === 'number' &&
    c.monthlyPrice > 0;
  const isFree = !c.isPaid || (!hasMonthlyFee && (fullFee ?? 0) <= 0);
  return {
    href: `${hrefPrefix}/${c._id}`,
    image: c.thumbnailUrl || '',
    title: c.title,
    description: c.shortDescription || '',
    price: isFree
      ? 'Free'
      : `${hasMonthlyFee ? c.monthlyPrice : fullFee}${hasMonthlyFee ? '/mo' : ''}`,
    isFree,
    badge: c.courseType === 'live' ? 'Live' : c.tags?.[0] || 'Course',
    badgeClass: 'bg-primary/90 text-on-primary',
    lessons: `${c.lessonCount ?? 0}+ Lessons`,
    actionLabel: c.courseType === 'live' ? 'View course' : 'Enroll Course',
    imageFallback: 'Course',
  };
}

export function mapLiveCourseRowToCard(c: PublicLiveCourseRow) {
  const fullFee = c.finalPrice ?? c.price ?? 0;
  const hasMonthlyFee =
    c.courseType === 'live' &&
    typeof c.monthlyPrice === 'number' &&
    (c.monthlyPrice as number) > 0;
  const isFree = !c.isPaid || (!hasMonthlyFee && (fullFee ?? 0) <= 0);
  return {
    href: `/enroll/course/${c._id}`,
    image: c.thumbnailUrl || '',
    title: c.title,
    description: c.shortDescription || '',
    price: isFree
      ? 'Free'
      : `${hasMonthlyFee ? c.monthlyPrice : fullFee}${hasMonthlyFee ? '/mo' : ''}`,
    isFree,
    badge: 'Live',
    badgeClass: 'bg-primary/90 text-on-primary',
    lessons: 'Live course',
    actionLabel: 'View course',
    imageFallback: 'Live',
  };
}

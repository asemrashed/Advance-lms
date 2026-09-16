import type { PublicBatchRow } from '@/services/publicBatchesService';

export function batchToCardProps(batch: PublicBatchRow) {
  const fullPrice = batch.coursePrice ?? 0;
  const hasMonthly = Boolean(batch.monthlyFee && batch.monthlyFee > 0);
  const isFree = !batch.courseIsPaid || (fullPrice <= 0 && !hasMonthly);
  return {
    href: batch.courseId ? `/enroll/course/${batch.courseId}` : `/enroll/${batch._id}`,
    image: batch.thumbnailUrl || '',
    title: batch.name,
    description: batch.shortDescription || batch.description || '',
    price: isFree
      ? 'Free'
      : `${hasMonthly ? (batch.monthlyFee as number) : fullPrice}${hasMonthly ? '/mo' : ''}`,
    isFree,
    badge: `Grade ${batch.grade}`,
    badgeClass: 'bg-primary/90 text-on-primary',
    lessons: `${batch.enrolledCount}/${batch.maxStudents} seats`,
    actionLabel: 'View batch',
    imageFallback: 'Batch',
  };
}

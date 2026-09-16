'use client';

import CourseCard from '@/components/CourseCard';
import { batchToCardProps } from '@/components/batches/batchCardProps';
import type { PublicBatchRow } from '@/services/publicBatchesService';

export { batchToCardProps } from '@/components/batches/batchCardProps';

export default function BatchCard({
  batch,
  index = 0,
  list = false,
}: {
  batch: PublicBatchRow;
  index?: number;
  list?: boolean;
}) {
  return (
    <CourseCard course={batchToCardProps(batch)} index={index} list={list} />
  );
}

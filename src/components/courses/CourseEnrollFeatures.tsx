'use client';

import { LuCircleCheck } from 'react-icons/lu';

export function CourseEnrollFeatures({ features }: { features: string[] }) {
  const lines = features.map((f) => f.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  return (
    <div className="border-t pt-4">
      <h3 className="mb-3 text-sm font-bold text-foreground">What&apos;s included</h3>
      <ul className="space-y-2">
        {lines.map((feature, i) => (
          <li key={i} className="flex gap-2 text-sm text-muted-foreground">
            <LuCircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

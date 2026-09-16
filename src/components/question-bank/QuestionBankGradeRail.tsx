'use client';

import { LuGraduationCap } from 'react-icons/lu';
import { BATCH_GRADES } from '@/lib/batchGrades';
import { formatGradeLabel } from '@/lib/courseLabel';

interface Props {
  value: string;
  onChange: (grade: string) => void;
}

export function QuestionBankGradeRail({ value, onChange }: Props) {
  return (
    <div className="shrink-0 rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <LuGraduationCap className="h-3.5 w-3.5" />
        Class / grade
      </div>
      <div className="scrollbar-hide mt-2 flex flex-wrap gap-2">
        <GradeChip active={value === 'all'} onClick={() => onChange('all')}>
          All grades
        </GradeChip>
        {BATCH_GRADES.map((g) => (
          <GradeChip key={g} active={value === g} onClick={() => onChange(g)}>
            {formatGradeLabel(g)}
          </GradeChip>
        ))}
      </div>
    </div>
  );
}

function GradeChip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
        active
          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
          : 'border-border bg-background text-foreground hover:bg-muted/50'
      }`}
    >
      {children}
    </button>
  );
}

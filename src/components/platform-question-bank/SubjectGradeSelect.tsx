'use client';

import { useEffect, useMemo } from 'react';
import { AttractiveSelect } from '@/components/ui/attractive-select';
import { useSubjects } from '@/hooks/useSubjects';
import { BATCH_GRADES } from '@/lib/batchGrades';
import { formatGradeLabel } from '@/lib/courseLabel';
import { extractSyllabusCode } from '@/lib/subjectUtils';
import type { Subject } from '@/types/subject';

export type SubjectGradeValue = {
  subjectId: string;
  subjectCode: string;
  subjectName: string;
  grade: string;
};

interface Props {
  value: SubjectGradeValue;
  onChange: (next: SubjectGradeValue) => void;
  paperCode?: string;
  required?: boolean;
  className?: string;
}

function findByCode(subjects: Subject[], code: string) {
  const normalized = code.trim().toUpperCase();
  return subjects.find((s) => s.code.toUpperCase() === normalized);
}

export default function SubjectGradeSelect({
  value,
  onChange,
  paperCode,
  required,
  className,
}: Props) {
  const { subjects, loading } = useSubjects({ limit: 200, isActive: true, sortBy: 'name' });

  const subjectOptions = useMemo(
    () =>
      subjects.map((s) => ({
        value: s._id,
        label: `${s.name} (${s.code})`,
      })),
    [subjects],
  );

  const gradeOptions = useMemo(
    () =>
      BATCH_GRADES.map((g) => ({
        value: g,
        label: formatGradeLabel(g),
      })),
    [],
  );

  useEffect(() => {
    if (!paperCode || value.subjectId) return;
    const code = extractSyllabusCode(paperCode);
    if (!code) return;
    const match = findByCode(subjects, code);
    if (!match) return;
    onChange({
      ...value,
      subjectId: match._id,
      subjectCode: match.code,
      subjectName: match.name,
    });
  }, [paperCode, subjects, value, onChange]);

  const handleSubject = (subjectId: string) => {
    const match = subjects.find((s) => s._id === subjectId);
    if (!match) return;
    onChange({
      ...value,
      subjectId: match._id,
      subjectCode: match.code,
      subjectName: match.name,
    });
  };

  return (
    <div className={className || 'grid gap-3 sm:grid-cols-2'}>
      <div>
        <label className="mb-1 block text-sm font-medium">
          Subject{required ? ' *' : ''}
        </label>
        <AttractiveSelect
          value={value.subjectId}
          onChange={(e) => handleSubject(e.target.value)}
          disabled={loading || !subjectOptions.length}
        >
          <option value="">{loading ? 'Loading subjects…' : 'Select subject'}</option>
          {subjectOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </AttractiveSelect>
        {!loading && !subjectOptions.length && (
          <p className="mt-1 text-xs text-muted-foreground">
            No subjects yet — add subjects under Admin → Subjects first.
          </p>
        )}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">
          Class / grade{required ? ' *' : ''}
        </label>
        <AttractiveSelect
          value={value.grade}
          onChange={(e) => onChange({ ...value, grade: e.target.value })}
        >
          <option value="">Select class / grade</option>
          {gradeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </AttractiveSelect>
      </div>
    </div>
  );
}

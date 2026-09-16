'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api/httpClient';

interface Props {
  subjectId?: string;
  /** Current price shown; when subject changes, loads from subject record. */
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Lets admin set/update Platform QB access price for the selected subject
 * during AI / sheet import flows (subject-level pricing only).
 */
export default function SubjectAccessPriceField({
  subjectId,
  value,
  onChange,
  disabled,
  className,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [hint, setHint] = useState('');

  useEffect(() => {
    if (!subjectId) {
      onChange('');
      setHint('');
      return;
    }
    let cancelled = false;
    (async () => {
      const res = await apiFetch(`/api/subjects?search=&limit=200&isActive=true`);
      if (!res.ok || cancelled) return;
      const json = await res.json();
      const list = json.data?.subjects || [];
      const match = list.find((s: { _id: string }) => s._id === subjectId);
      if (match && !cancelled) {
        onChange(
          match.qbAccessPrice != null && Number.isFinite(Number(match.qbAccessPrice))
            ? String(match.qbAccessPrice)
            : '',
        );
        setHint(match.name ? `Price for ${match.name}` : '');
      }
    })();
    return () => {
      cancelled = true;
    };
    // intentionally only when subjectId changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId]);

  const savePrice = async () => {
    if (!subjectId) return;
    const n = value.trim() === '' ? null : Number(value);
    if (value.trim() !== '' && (!Number.isFinite(n) || (n as number) < 0)) {
      setHint('Enter a valid BDT amount');
      return;
    }
    setSaving(true);
    try {
      const res = await apiFetch(`/api/subjects/${subjectId}`, {
        method: 'PUT',
        body: JSON.stringify({ qbAccessPrice: n }),
      });
      if (!res.ok) {
        setHint('Could not save price');
        return;
      }
      setHint('Access price saved');
    } finally {
      setSaving(false);
    }
  };

  if (!subjectId) return null;

  return (
    <div className={className}>
      <label className="mb-1 block text-sm font-medium">Platform QB access price (৳)</label>
      <div className="flex gap-2">
        <Input
          type="number"
          min={0}
          step={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. 500"
          disabled={disabled || saving}
        />
        <button
          type="button"
          onClick={() => void savePrice()}
          disabled={disabled || saving}
          className="shrink-0 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save price'}
        </button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {hint || 'Subject-level fee for instructors borrowing this subject. Not per topic.'}
      </p>
    </div>
  );
}

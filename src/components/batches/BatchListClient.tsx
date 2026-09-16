'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { BatchCreateForm } from '@/components/batches/BatchCreateForm';
import { batchesService, type BatchRecord } from '@/services/batchesService';
import { LuPlus as Plus } from 'react-icons/lu';
import { DashboardBatchCard } from './DashboardBatchCard';

type InstructorOption = {
  _id: string;
  label: string;
};

export function BatchListClient({
  detailBasePath,
  allowCreate = false,
  requireInstructorId = false,
  emptyMessage = 'No batches found.',
}: {
  detailBasePath: string;
  allowCreate?: boolean;
  requireInstructorId?: boolean;
  emptyMessage?: string;
}) {
  const [batches, setBatches] = useState<BatchRecord[]>([]);
  const [instructors, setInstructors] = useState<InstructorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setLoading(true);
    const res = await batchesService.listBatches();
    if (res.success && res.data) {
      setBatches(res.data.batches);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!requireInstructorId) return;
    const loadInstructors = async () => {
      try {
        const res = await fetch('/api/teachers?limit=500');
        const data = await res.json();
        const rows = Array.isArray(data?.teachers) ? data.teachers : [];
        setInstructors(
          rows.map((t: Record<string, unknown>) => {
            const name =
              String(t.name || "").trim() ||
              String(t.email || 'Instructor');
            return { _id: String(t._id), label: name };
          }),
        );
      } catch {
        setInstructors([]);
      }
    };
    loadInstructors();
  }, [requireInstructorId]);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Batches</h1>
        {allowCreate && (
          <Button onClick={() => setShowForm((v) => !v)}>
            <Plus className="mr-1 h-4 w-4" />
            New batch
          </Button>
        )}
      </div>

      {showForm && allowCreate && (
        <BatchCreateForm
          allowInstructorPick={requireInstructorId}
          instructors={instructors}
          onCreated={() => {
            setShowForm(false);
            load();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {loading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : batches.length === 0 ? (
        <p className="text-muted-foreground">{emptyMessage}</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {batches.map((b) => (
            <DashboardBatchCard
              key={b._id}
              className="w-full"
              batch={{
                _id: b._id,
                name: b.name,
                grade: b.grade || 'O',
                shortDescription: b.shortDescription || '',
                thumbnailUrl: b.thumbnailUrl || '',
                fee: b.monthlyFee ?? 0,
                maxStudents: b.maxStudents,
                enrolledCount: b.enrolledCount ?? 0,
              }}
              manageHref={`${detailBasePath}/${b._id}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { batchReconcileService } from '@/services/batchReconcileService';

type ReconcileRow = {
  id: string;
  batchId: string;
  batchName?: string;
  batchSubject?: string;
  maxStudents?: number;
  studentId: string;
  studentName: string;
  studentPhone?: string;
  paymentId?: string;
  paymentAmount?: number;
  enrolledAt?: string;
  reconcileNote?: string;
};

export default function AdminBatchReconcileClient() {
  const [rows, setRows] = useState<ReconcileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await batchReconcileService.listQueue();
      const res = (await response.json()) as {
        success: boolean;
        data?: { enrollments: ReconcileRow[] };
        error?: string;
      };
      if (!res.success) {
        setError(res.error || 'Failed to load');
        setRows([]);
        return;
      }
      setRows(res.data?.enrollments ?? []);
    } catch {
      setError('Failed to load reconciliation queue');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patchRow = async (id: string, action: 'activate' | 'note') => {
    setBusyId(id);
    setError(null);
    try {
      const response = await batchReconcileService.reconcile(id, {
          action,
          note: notes[id]?.trim() || undefined,
        });
      const res = (await response.json()) as { success: boolean; error?: string };
      if (!res.success) {
        setError(res.error || 'Action failed');
        return;
      }
      await load();
    } catch {
      setError('Action failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Batch payment reconciliation</h1>
        <p className="text-sm text-gray-600 mt-1">
          Paid enrollments suspended because the batch was full. Activate to grant access (capacity override) or save an admin note for follow-up.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Queue</CardTitle>
          <CardDescription>
            {loading ? 'Loading…' : `${rows.length} enrollment(s) need attention`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-gray-500">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-gray-500">No paid + suspended batch enrollments.</p>
          ) : (
            <div className="space-y-4">
              {rows.map((row) => (
                <div
                  key={row.id}
                  className="rounded-lg border border-gray-200 p-4 space-y-3"
                >
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                    <span><strong>Student:</strong> {row.studentName}</span>
                    {row.studentPhone && <span><strong>Phone:</strong> {row.studentPhone}</span>}
                    <span><strong>Batch:</strong> {row.batchName || row.batchSubject || row.batchId}</span>
                    {row.paymentId && <span><strong>Txn:</strong> {row.paymentId}</span>}
                    {row.paymentAmount != null && (
                      <span><strong>Amount:</strong> ৳{row.paymentAmount}</span>
                    )}
                  </div>
                  {row.reconcileNote && (
                    <p className="text-sm text-amber-800 bg-amber-50 rounded px-2 py-1">
                      Note: {row.reconcileNote}
                    </p>
                  )}
                  <textarea
                    className="w-full min-h-[72px] rounded-md border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Admin note (optional for activate; required for note-only)"
                    value={notes[row.id] ?? ''}
                    onChange={(e) =>
                      setNotes((prev) => ({ ...prev, [row.id]: e.target.value }))
                    }
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={busyId === row.id}
                      onClick={() => void patchRow(row.id, 'activate')}
                    >
                      Activate (override capacity)
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={busyId === row.id || !notes[row.id]?.trim()}
                      onClick={() => void patchRow(row.id, 'note')}
                    >
                      Save note only
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

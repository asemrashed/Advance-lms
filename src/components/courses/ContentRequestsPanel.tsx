'use client';

import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import ConfirmModal from '@/components/ui/confirm-modal';
import { apiFetch } from '@/lib/api/httpClient';
import {
  LuCheck as Check,
  LuX as X,
  LuEye as Eye,
  LuTrash2 as Trash2,
  LuLoader as Loader2,
} from 'react-icons/lu';

export type ContentRequestRow = {
  _id: string;
  type: 'course' | 'batch';
  status: 'pending' | 'approved' | 'rejected';
  courseId: string;
  courseName: string;
  batchId?: string;
  batchName?: string;
  instructorName: string;
  price: number;
  isPaid: boolean;
  createdAt: string;
};

function typeLabel(type: ContentRequestRow['type'], batchName?: string) {
  if (type === 'batch') return batchName ? `Batch: ${batchName}` : 'Batch section';
  return 'Course';
}

export default function ContentRequestsPanel() {
  const router = useRouter();
  const [requests, setRequests] = useState<ContentRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ContentRequestRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/admin/content-requests?status=pending&limit=50');
      const data = await res.json();
      if (res.ok) {
        setRequests(Array.isArray(data?.data?.requests) ? data.data.requests : []);
      } else {
        setRequests([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const review = async (id: string, action: 'approve' | 'reject') => {
    setBusyId(id);
    try {
      const res = await apiFetch(`/api/admin/content-requests/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        await load();
      } else {
        alert(
          typeof data?.error === 'string'
            ? data.error
            : `Failed to ${action} request`,
        );
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget._id);
    try {
      const res = await apiFetch(`/api/admin/content-requests/${deleteTarget._id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setDeleteTarget(null);
        await load();
      }
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading requests...
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-12 text-center">
        <p className="text-sm font-medium text-gray-700">No pending course requests</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Instructor submissions will appear here for review.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Instructor</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Price</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((row) => (
              <TableRow key={row._id}>
                <TableCell>
                  <Badge variant="outline">{typeLabel(row.type, row.batchName)}</Badge>
                </TableCell>
                <TableCell className="font-medium">{row.courseName || '—'}</TableCell>
                <TableCell>{row.instructorName || '—'}</TableCell>
                <TableCell>
                  {row.createdAt
                    ? format(new Date(row.createdAt), 'MMM d, yyyy')
                    : '—'}
                </TableCell>
                <TableCell>
                  {row.isPaid && row.price > 0 ? `৳${row.price}` : 'Free'}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-1"
                      onClick={() =>
                        router.push(
                          `/admin/courses/${row.courseId}/review?requestId=${row._id}`,
                        )
                      }
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="gap-1 bg-green-600 hover:bg-green-700"
                      disabled={busyId === row._id}
                      onClick={() => void review(row._id, 'approve')}
                    >
                      {busyId === row._id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Accept
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-1 border-red-200 text-red-700 hover:bg-red-50"
                      disabled={busyId === row._id}
                      onClick={() => void review(row._id, 'reject')}
                    >
                      <X className="h-4 w-4" />
                      Reject
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="gap-1 text-red-700"
                      disabled={busyId === row._id}
                      onClick={() => setDeleteTarget(row)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete request"
        description={`Delete this ${deleteTarget?.type} request${deleteTarget?.type === 'batch' ? ' and its pending batch section' : ''}?`}
        confirmText="Delete"
        variant="danger"
        loading={busyId === deleteTarget?._id}
      />
    </>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Teacher } from '@/types/teacher';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { teachersStaffService } from '@/services/teachersStaffService';
import { LuCheck as Check, LuBan as Ban, LuLoader as Loader2 } from 'react-icons/lu';

interface TeacherRequestsPanelProps {
  onStatusChange?: () => void;
}

function getStatusBadge(status: Teacher['accountStatus']) {
  switch (status) {
    case 'active':
      return <Badge variant="default">Active</Badge>;
    case 'blocked':
      return <Badge variant="destructive">Blocked</Badge>;
  }
  return <Badge variant="secondary">Pending</Badge>;
}

export default function TeacherRequestsPanel({ onStatusChange }: TeacherRequestsPanelProps) {
  const [requests, setRequests] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: 'pending',
        limit: '50',
      });
      const response = await teachersStaffService.listTeachers(params.toString());
      const data = await response.json();
      if (response.ok) {
        setRequests(Array.isArray(data?.teachers) ? data.teachers : []);
      } else {
        setRequests([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (
    teacherId: string,
    accountStatus: 'active' | 'blocked',
  ) => {
    setBusyId(teacherId);
    try {
      const response = await teachersStaffService.updateTeacher(teacherId, {
        accountStatus,
      });
      if (response.ok) {
        await load();
        onStatusChange?.();
      }
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return <p className="py-8 text-center text-muted-foreground">Loading requests...</p>;
  }

  if (requests.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 py-12 text-center">
        <p className="text-sm font-medium text-gray-700">No pending instructor requests</p>
        <p className="mt-1 text-sm text-muted-foreground">
          New instructor sign-ups from the register page will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {requests.map((teacher) => (
        <Card key={teacher._id} className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-gray-900">
                  {teacher.name}
                </p>
                {getStatusBadge(teacher.accountStatus)}
              </div>
              <p className="mt-1 text-sm text-gray-600">{teacher.phone || 'No phone'}</p>
              {teacher.passOutInstitute ? (
                <p className="mt-2 text-sm text-gray-700">
                  <span className="font-medium">Pass out institute:</span> {teacher.passOutInstitute}
                </p>
              ) : null}
              {teacher.education ? (
                <p className="mt-2 text-sm text-gray-700">
                  <span className="font-medium">Education:</span> {teacher.education}
                </p>
              ) : null}
              {teacher.specialization ? (
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Specialization:</span> {teacher.specialization}
                </p>
              ) : null}
              {teacher.experience ? (
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Experience:</span> {teacher.experience}
                </p>
              ) : null}
              <p className="mt-2 text-xs text-muted-foreground">
                Applied {teacher.createdAt ? format(new Date(teacher.createdAt), 'MMM dd, yyyy HH:mm') : '—'}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => updateStatus(teacher._id, 'active')}
                disabled={busyId === teacher._id}
                className="text-white"
                style={{
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                }}
              >
                {busyId === teacher._id ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Check className="mr-1 h-4 w-4" />
                )}
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => updateStatus(teacher._id, 'blocked')}
                disabled={busyId === teacher._id}
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                <Ban className="mr-1 h-4 w-4" />
                Reject
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

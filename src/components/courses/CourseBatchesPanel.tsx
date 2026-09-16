'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import PageSection from '@/components/PageSection';
import FormModal from '@/components/ui/form-modal';
import { InstructorSelector } from '@/components/ui/instructor-selector';
import {
  BatchMarketingFormFields,
  type BatchMarketingFormState,
} from '@/components/batches/BatchMarketingFormFields';
import { batchesService, type BatchRecord } from '@/services/batchesService';
import { coursesStaffService } from '@/services/coursesStaffService';
import { useTeachers } from '@/hooks/useTeachers';
import {
  LuCalendar as Calendar,
  LuCalendarClock,
  LuEllipsisVertical as MoreVertical,
  LuLoader as Loader2,
  LuPencil,
  LuPlus as Plus,
  LuTrash2,
} from 'react-icons/lu';

type CourseBatchesPanelProps = {
  courseId: string;
  role: 'admin' | 'instructor';
  selectedBatchId: string | null;
  onSelectBatch: (batchId: string | null) => void;
  onOpenOperations?: (batchId: string) => void;
  autoOpenCreate?: boolean;
  onAutoOpenConsumed?: () => void;
};

const emptyForm = (): BatchMarketingFormState => ({
  name: '',
  startDate: '',
  endDate: '',
  maxStudents: '30',
  fee: '0',
  shortDescription: '',
  description: '',
  videoUrl: '',
  thumbnailUrl: '',
});

function toDateInput(value?: string) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export function CourseBatchesPanel({
  courseId,
  role,
  selectedBatchId,
  onSelectBatch,
  onOpenOperations,
  autoOpenCreate = false,
  onAutoOpenConsumed,
}: CourseBatchesPanelProps) {
  const [batches, setBatches] = useState<BatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<BatchMarketingFormState>(emptyForm);
  const [instructorId, setInstructorId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { teachers } = useTeachers();
  const teacherNameById = useCallback(
    (id: string) => {
      const teacher = teachers.find((t) => t._id === id);
      if (!teacher) return null;
      return teacher.name?.trim() || teacher.email;
    },
    [teachers],
  );
  const batchInstructorNames = useCallback(
    (batch: BatchRecord) => {
      const ids =
        Array.isArray(batch.instructorIds) && batch.instructorIds.length > 0
          ? batch.instructorIds
          : batch.instructorId
            ? [batch.instructorId]
            : [];
      return ids.map((id) => teacherNameById(id)).filter(Boolean) as string[];
    },
    [teacherNameById],
  );

  const loadBatches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await coursesStaffService.listCourseBatches(courseId);
      const data = await res.json();
      const list = Array.isArray(data?.data?.batches)
        ? (data.data.batches as BatchRecord[])
        : [];
      setBatches(list);
      if (list.length === 0) {
        onSelectBatch(null);
      } else if (
        selectedBatchId &&
        !list.some((batch) => batch._id === selectedBatchId)
      ) {
        onSelectBatch(list[0]._id);
      }
    } catch {
      setBatches([]);
    } finally {
      setLoading(false);
    }
  }, [courseId, onSelectBatch, selectedBatchId]);

  useEffect(() => {
    void loadBatches();
  }, [loadBatches]);

  useEffect(() => {
    if (!loading && autoOpenCreate && batches.length === 0 && !showForm) {
      setShowForm(true);
      onAutoOpenConsumed?.();
    }
  }, [loading, autoOpenCreate, batches.length, showForm, onAutoOpenConsumed]);

  const openCreateModal = () => {
    setEditingBatchId(null);
    setForm(emptyForm());
    setInstructorId(undefined);
    setError(null);
    setNotice(null);
    setShowForm(true);
  };

  const openEditModal = (batch: BatchRecord) => {
    setEditingBatchId(batch._id);
    setForm({
      name: batch.name || '',
      startDate: toDateInput(batch.startDate),
      endDate: toDateInput(batch.endDate),
      maxStudents: String(batch.maxStudents || 30),
      fee: '0',
      shortDescription: batch.shortDescription || '',
      description: '',
      videoUrl: '',
      thumbnailUrl: batch.thumbnailUrl || '',
    });
    const ids =
      Array.isArray(batch.instructorIds) && batch.instructorIds.length > 0
        ? batch.instructorIds
        : batch.instructorId
          ? [batch.instructorId]
          : [];
    setInstructorId(ids[0]);
    setError(null);
    setNotice(null);
    setShowForm(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setError('Section name is required');
      return;
    }
    if (!form.startDate || !form.endDate) {
      setError('Start and end dates are required');
      return;
    }
    if (new Date(form.startDate).getTime() > new Date(form.endDate).getTime()) {
      setError('Start date must be on or before end date');
      return;
    }
    const maxStudents = Number(form.maxStudents);
    if (!Number.isInteger(maxStudents) || maxStudents < 1) {
      setError('Max students must be a positive integer');
      return;
    }

    setCreating(true);
    setError(null);
    setNotice(null);
    try {
      if (editingBatchId) {
        const res = await batchesService.updateBatch(editingBatchId, {
          name: form.name.trim(),
          startDate: form.startDate,
          endDate: form.endDate,
          maxStudents,
          fee: 0,
          shortDescription: form.shortDescription.trim() || form.name.trim(),
          thumbnailUrl: form.thumbnailUrl || undefined,
          ...(role === 'admin' && instructorId
            ? { instructorIds: [instructorId] }
            : {}),
        });
        if (!res.success) {
          setError(res.error || 'Failed to update batch');
          return;
        }
        setShowForm(false);
        setEditingBatchId(null);
        await loadBatches();
        onSelectBatch(editingBatchId);
        setNotice('Batch section updated.');
      } else {
        const res = await batchesService.createBatch({
          courseId,
          name: form.name.trim(),
          startDate: form.startDate,
          endDate: form.endDate,
          maxStudents,
          fee: 0,
          shortDescription: form.shortDescription.trim() || form.name.trim(),
          description: undefined,
          thumbnailUrl: form.thumbnailUrl || undefined,
          ...(role === 'admin' && instructorId
            ? { instructorIds: [instructorId] }
            : {}),
          schedule: [],
        });

        if (!res.success || !res.data?.batch) {
          setError(res.error || 'Failed to create batch');
          return;
        }

        const createdId = res.data.batch._id;
        setShowForm(false);
        setForm(emptyForm());
        setInstructorId(undefined);
        await loadBatches();
        onSelectBatch(createdId);
        onOpenOperations?.(createdId);
        setNotice(
          'Batch section created. Set the weekly routine and live classes in Schedule.',
        );
      }
    } catch {
      setError(editingBatchId ? 'Failed to update batch' : 'Failed to create batch');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (batch: BatchRecord) => {
    const confirmed = window.confirm(
      `Deactivate “${batch.name}”? Enrollments and history are preserved.`,
    );
    if (!confirmed) return;
    setDeletingId(batch._id);
    setError(null);
    setNotice(null);
    try {
      const res = await batchesService.deleteBatch(batch._id);
      if (!res.success) {
        setError(res.error || 'Failed to delete batch');
        return;
      }
      await loadBatches();
      setNotice('Batch deactivated.');
    } catch {
      setError('Failed to delete batch');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <PageSection title="Batch sections" description="Loading batches…">
        <div className="flex items-center justify-center py-10 text-gray-500">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading batches…
        </div>
      </PageSection>
    );
  }

  return (
    <>
      <PageSection
        title="Batch sections"
        description="Sections share this course's curriculum and price. Set seat limits and schedules per section."
        actions={
          <Button type="button" onClick={openCreateModal} className="gap-2">
            <Plus className="h-4 w-4" />
            Add section
          </Button>
        }
      >
        {batches.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-gray-600">
              <Calendar className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              <p className="font-medium">No batch sections yet</p>
              <p className="mt-1 text-sm text-gray-500">
                Add sections (e.g. Morning / Evening) so students can pick a
                schedule. Curriculum is managed at the course level.
              </p>
              <Button type="button" className="mt-4 gap-2" onClick={openCreateModal}>
                <Plus className="h-4 w-4" />
                Add first section
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[640px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Section</th>
                  <th className="px-4 py-3">Schedule</th>
                  <th className="px-4 py-3">Seats</th>
                  <th className="px-4 py-3">Instructor</th>
                  <th className="w-16 px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((batch) => {
                  const names = batchInstructorNames(batch);
                  const isSelected = selectedBatchId === batch._id;
                  return (
                    <tr
                      key={batch._id}
                      className={
                        'border-b border-border last:border-b-0 transition-colors hover:bg-muted/30 ' +
                        (isSelected ? 'bg-primary/5' : '')
                      }
                    >
                      <td className="px-4 py-3 align-top">
                        <p className="font-medium text-gray-900">{batch.name}</p>
                        {batch.shortDescription ? (
                          <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">
                            {batch.shortDescription}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 align-top text-gray-600">
                        {new Date(batch.startDate).toLocaleDateString()} –{' '}
                        {new Date(batch.endDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 align-top text-gray-600">
                        {batch.enrolledCount ?? 0} / {batch.maxStudents}
                      </td>
                      <td className="px-4 py-3 align-top">
                        {names.length > 0 ? (
                          <span className="text-gray-700">{names.join(', ')}</span>
                        ) : (
                          <span className="italic text-gray-400">Not assigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right align-top">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              disabled={deletingId === batch._id}
                              aria-label={`Actions for ${batch.name}`}
                            >
                              {deletingId === batch._id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <MoreVertical className="h-4 w-4" />
                              )}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onSelect={() => openEditModal(batch)}>
                              <LuPencil className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onSelect={() => {
                                onSelectBatch(batch._id);
                                onOpenOperations?.(batch._id);
                              }}
                            >
                              <LuCalendarClock className="mr-2 h-4 w-4" />
                              Schedule / Operations
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onSelect={(event) => {
                                event.preventDefault();
                                void handleDelete(batch);
                              }}
                            >
                              <LuTrash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {notice && (
          <p className="mb-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
            {notice}
          </p>
        )}
        {error && !showForm ? (
          <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
      </PageSection>

      <FormModal
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingBatchId(null);
        }}
        onSubmit={handleSubmit}
        title={editingBatchId ? 'Edit batch section' : 'Add batch section'}
        description="Sections only control seat limits and schedule. Price and curriculum belong to the course."
        submitText={editingBatchId ? 'Save changes' : 'Add section'}
        loading={creating}
        size="lg"
        formId="batch-section-form"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <BatchMarketingFormFields
            form={form}
            setForm={setForm}
            features={[]}
            onFeaturesChange={() => {}}
            showScheduleFields
            mode="section"
          />
          {role === 'admin' && (
            <div className="sm:col-span-2">
              <InstructorSelector
                label="Instructor (optional)"
                placeholder="Select an instructor for this section"
                value={instructorId}
                onChange={(id) => setInstructorId(id)}
              />
            </div>
          )}
          {error && (
            <p className="text-sm text-red-600 sm:col-span-2">{error}</p>
          )}
        </div>
      </FormModal>
    </>
  );
}

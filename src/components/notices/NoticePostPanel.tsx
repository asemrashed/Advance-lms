'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { AttractiveInput } from '@/components/ui/attractive-input';
import PageSection from '@/components/dashboard/lp/PageSection';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { noticesService } from '@/services/noticesService';
import { resourceScopeService } from '@/services/resourceScopeService';
import type { CreateNoticeDto, NoticeCategory } from '@/types/notice';
import { LuSend } from 'react-icons/lu';

type StaffRole = 'admin' | 'instructor';
type ScopeOption = { _id: string; label: string };

const NONE = '__none__';

async function loadAllCourses(): Promise<ScopeOption[]> {
  const [live, recorded] = await Promise.all([
    resourceScopeService.listCourses('live'),
    resourceScopeService.listCourses('recorded'),
  ]);
  const seen = new Set<string>();
  const merged: ScopeOption[] = [];
  for (const row of [...live, ...recorded]) {
    if (seen.has(row._id)) continue;
    seen.add(row._id);
    merged.push(row);
  }
  return merged.sort((a, b) => a.label.localeCompare(b.label));
}

export function NoticePostPanel({
  role,
  instructors = [],
  onPosted,
  compact = false,
}: {
  role: StaffRole;
  instructors?: Array<{ _id: string; name: string }>;
  onPosted?: () => void;
  compact?: boolean;
}) {
  const categories: NoticeCategory[] =
    role === 'admin' ? ['admin', 'subject', 'teacher'] : ['subject', 'teacher'];

  const [category, setCategory] = useState<NoticeCategory>(categories[0]);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [subject, setSubject] = useState('');
  const [instructorId, setInstructorId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [courses, setCourses] = useState<ScopeOption[]>([]);
  const [batches, setBatches] = useState<ScopeOption[]>([]);
  const [loadingScope, setLoadingScope] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoadingScope(true);
      try {
        setCourses(await loadAllCourses());
      } finally {
        setLoadingScope(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!courseId) {
      setBatches([]);
      setBatchId('');
      return;
    }

    void (async () => {
      const rows = await resourceScopeService.listBatchesForCourse(courseId);
      setBatches(rows);
      setBatchId((current) =>
        current && rows.some((row) => row._id === current) ? current : '',
      );
    })();
  }, [courseId]);

  const reset = () => {
    setTitle('');
    setBody('');
    setSubject('');
    setInstructorId('');
    setCourseId('');
    setBatchId('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);
    try {
      const payload: CreateNoticeDto = {
        title: title.trim(),
        body: body.trim(),
        category,
        ...(category === 'subject' ? { subject: subject.trim() } : {}),
        ...(category === 'teacher' && role === 'admin'
          ? { instructorId }
          : {}),
        ...(courseId ? { courseId } : {}),
        ...(batchId ? { batchId } : {}),
      };

      const { res, error: apiError } = await noticesService.create(payload);
      if (!res.ok) {
        setError(apiError || 'Failed to post notice');
        return;
      }
      reset();
      setSuccess('Notice posted.');
      onPosted?.();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageSection
      title="Post a notice"
      description={
        role === 'admin'
          ? 'Platform, subject, or teacher announcements — optionally target a course or batch'
          : 'Subject or teacher notices — optionally target your course or batch'
      }
      className={compact ? 'mt-4' : 'mt-2'}
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium">Category</label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as NoticeCategory)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c === 'admin' ? 'Platform (admin)' : c === 'subject' ? 'Subject' : 'Teacher'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {category === 'subject' ? (
            <AttractiveInput
              label="Subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Physics"
              required
            />
          ) : null}
          {category === 'teacher' && role === 'admin' ? (
            <div>
              <label className="mb-1 block text-sm font-medium">Teacher</label>
              <Select value={instructorId} onValueChange={setInstructorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select instructor" />
                </SelectTrigger>
                <SelectContent>
                  {instructors.map((t) => (
                    <SelectItem key={t._id} value={t._id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>

        <div className="rounded-lg border bg-muted/30 p-3">
          <p className="mb-2 text-sm font-medium">Audience (optional)</p>
          <p className="mb-3 text-xs text-muted-foreground">
            Leave blank to use category rules. Pick a course or batch to send only to enrolled students.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Course</label>
              <Select
                value={courseId || NONE}
                onValueChange={(v) => setCourseId(v === NONE ? '' : v)}
                disabled={loadingScope}
              >
                <SelectTrigger>
                  <SelectValue placeholder={loadingScope ? 'Loading…' : 'All courses'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>All courses (category rules)</SelectItem>
                  {courses.map((course) => (
                    <SelectItem key={course._id} value={course._id}>
                      {course.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Batch</label>
              <Select
                value={batchId || NONE}
                onValueChange={(v) => setBatchId(v === NONE ? '' : v)}
                disabled={!courseId || batches.length === 0}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      !courseId
                        ? 'Select a course first'
                        : batches.length === 0
                          ? 'No batches for course'
                          : 'All batches in course'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>
                    {courseId ? 'All batches in course' : 'Select a course first'}
                  </SelectItem>
                  {batches.map((batch) => (
                    <SelectItem key={batch._id} value={batch._id}>
                      {batch.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <AttractiveInput
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <div>
          <label className="mb-1 block text-sm font-medium">Message</label>
          <textarea
            className="min-h-[100px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {success ? <p className="text-sm text-emerald-600">{success}</p> : null}
        <Button type="submit" disabled={submitting}>
          <LuSend className="mr-2 h-4 w-4" />
          {submitting ? 'Posting…' : 'Post notice'}
        </Button>
      </form>
    </PageSection>
  );
}

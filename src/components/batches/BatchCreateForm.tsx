'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  BatchMarketingFormFields,
  type BatchMarketingFormState,
} from '@/components/batches/BatchMarketingFormFields';
import { batchesService } from '@/services/batchesService';

type InstructorOption = { _id: string; label: string };

export function BatchCreateForm({
  allowInstructorPick = false,
  instructors = [],
  onCreated,
  onCancel,
}: {
  allowInstructorPick?: boolean;
  instructors?: InstructorOption[];
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<BatchMarketingFormState>({
    name: '',
    startDate: '',
    endDate: '',
    maxStudents: '30',
    fee: '',
    shortDescription: '',
    description: '',
    videoUrl: '',
    thumbnailUrl: '',
  });
  const [instructorIds, setInstructorIds] = useState<string[]>([]);
  const [features, setFeatures] = useState<string[]>(['']);

  const handleSubmit = async () => {
    setSaving(true);
    setError(null);
    const res = await batchesService.createBatch({
      name: form.name.trim(),
      instructorIds: instructorIds.length > 0 ? instructorIds : undefined,
      startDate: form.startDate,
      endDate: form.endDate,
      maxStudents: Number(form.maxStudents),
      fee: 0,
      shortDescription: form.shortDescription.trim(),
      description: form.description.trim() || undefined,
      thumbnailUrl: form.thumbnailUrl,
      videoUrl: form.videoUrl.trim() || undefined,
      features: features.map((f) => f.trim()).filter(Boolean),
      schedule: [],
    });
    setSaving(false);
    if (res.success) {
      onCreated();
    } else {
      setError(res.error || 'Failed to create batch');
    }
  };

  const canSubmit =
    form.name.trim() &&
    form.shortDescription.trim() &&
    form.startDate &&
    form.endDate;

  const toggleInstructor = (id: string) => {
    setInstructorIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Create batch</CardTitle>
        <p className="text-sm text-muted-foreground">
          Instructors are optional at creation — add subject classes after saving.
        </p>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <BatchMarketingFormFields
          form={form}
          setForm={setForm}
          features={features}
          onFeaturesChange={setFeatures}
          showScheduleFields
          mode="standalone"
        />
        {allowInstructorPick && instructors.length > 0 && (
          <div className="sm:col-span-2">
            <Label>Batch instructors (optional)</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {instructors.map((ins) => (
                <label
                  key={ins._id}
                  className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={instructorIds.includes(ins._id)}
                    onChange={() => toggleInstructor(ins._id)}
                  />
                  {ins.label}
                </label>
              ))}
            </div>
          </div>
        )}
        {error && <p className="text-sm text-destructive sm:col-span-2">{error}</p>}
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <Button disabled={!canSubmit || saving} onClick={handleSubmit}>
            {saving ? 'Creating…' : 'Create batch'}
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

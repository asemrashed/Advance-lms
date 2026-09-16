'use client';

import type { Dispatch, SetStateAction } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { FeaturesEditor } from '@/components/batches/FeaturesEditor';
import { ImageSourceField } from '@/components/ui/ImageSourceField';
import { UPLOAD_ENDPOINTS } from '@/lib/uploadImage';

export type BatchMarketingFormState = {
  name: string;
  shortDescription: string;
  description: string;
  thumbnailUrl: string;
  videoUrl: string;
  fee: string;
  monthlyFee?: string;
  startDate: string;
  endDate: string;
  maxStudents: string;
};

type Props = {
  form: BatchMarketingFormState;
  setForm: Dispatch<SetStateAction<BatchMarketingFormState>>;
  features: string[];
  onFeaturesChange: (features: string[]) => void;
  showScheduleFields?: boolean;
  /** @deprecated Use mode="section" for live course batches */
  requireCore?: boolean;
  /** standalone = legacy full marketing batch; section = live course section (no price) */
  mode?: 'standalone' | 'section';
};

export function BatchMarketingFormFields({
  form,
  setForm,
  features,
  onFeaturesChange,
  showScheduleFields = false,
  requireCore = false,
  mode = 'standalone',
}: Props) {
  const isSection = mode === 'section';
  const req = !isSection && requireCore ? (
    <span className="text-destructive"> *</span>
  ) : null;

  return (
    <>
      <div className="sm:col-span-2">
        <ImageSourceField
          label={`Cover image${isSection ? ' (optional)' : requireCore ? ' *' : ''}`}
          value={form.thumbnailUrl}
          onChange={(url) => setForm((f) => ({ ...f, thumbnailUrl: url }))}
          uploadEndpoint={UPLOAD_ENDPOINTS.batchCover}
          hint="Upload from your device or paste an image URL."
        />
      </div>
      <div className="sm:col-span-2">
        <Label>Section name{req}</Label>
        <Input
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder={isSection ? 'e.g. Morning batch, Section A' : undefined}
        />
      </div>
      {!isSection && (
        <>
          <div>
            <Label>Full Price (BDT){req}</Label>
            <Input
              type="number"
              min={0}
              value={form.fee}
              onChange={(e) => setForm((f) => ({ ...f, fee: e.target.value }))}
            />
          </div>
          <div>
            <Label>Monthly Price (BDT) (Optional)</Label>
            <Input
              type="number"
              min={0}
              value={form.monthlyFee ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, monthlyFee: e.target.value }))}
              placeholder="0"
            />
          </div>
        </>
      )}
      <div className="sm:col-span-2">
        <Label>
          Short description{isSection ? ' (optional)' : req}
        </Label>
        <Input
          value={form.shortDescription}
          onChange={(e) => setForm((f) => ({ ...f, shortDescription: e.target.value }))}
          placeholder={
            isSection
              ? 'Optional note for this section'
              : 'Shown on card and hero (1–2 lines)'
          }
        />
      </div>
      {!isSection && (
        <>
          <div className="sm:col-span-2">
            <Label>Preview video URL (optional)</Label>
            <Input
              value={form.videoUrl}
              onChange={(e) => setForm((f) => ({ ...f, videoUrl: e.target.value }))}
              placeholder="YouTube, Vimeo, or direct .mp4 link"
            />
          </div>
          <div className="sm:col-span-2">
            <Label>Full description (optional)</Label>
            <textarea
              className="flex min-h-[80px] w-full rounded-md border bg-background px-3 py-2 text-sm"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <FeaturesEditor features={features} onChange={onFeaturesChange} />
        </>
      )}
      {showScheduleFields && (
        <>
          <div>
            <Label>Start date</Label>
            <Input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
            />
          </div>
          <div>
            <Label>End date</Label>
            <Input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
            />
          </div>
          <div>
            <Label>Max students (seat limit)</Label>
            <Input
              type="number"
              min={1}
              value={form.maxStudents}
              onChange={(e) => setForm((f) => ({ ...f, maxStudents: e.target.value }))}
            />
          </div>
        </>
      )}
    </>
  );
}

'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LuPlus, LuTrash2 } from 'react-icons/lu';

export function FeaturesEditor({
  features,
  onChange,
}: {
  features: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="space-y-2 sm:col-span-2">
      <div className="flex items-center justify-between">
        <Label>Course features (optional)</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onChange([...features, ''])}
        >
          <LuPlus className="mr-1 h-3 w-3" />
          Add
        </Button>
      </div>
      {features.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          e.g. Live classes, PDF sheets, quizzes — shown on the enroll card.
        </p>
      ) : (
        features.map((line, index) => (
          <div key={index} className="flex gap-2">
            <Input
              value={line}
              placeholder="Feature line"
              onChange={(e) => {
                const next = [...features];
                next[index] = e.target.value;
                onChange(next);
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 text-destructive"
              onClick={() => onChange(features.filter((_, i) => i !== index))}
            >
              <LuTrash2 className="h-4 w-4" />
            </Button>
          </div>
        ))
      )}
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { platformQuestionsService } from '@/services/platformQuestionsService';

type SubjectNode = {
  subject: string;
  topics: { topic: string }[];
};

type PlatformSubjectTopicSelectProps = {
  subject: string;
  topic: string;
  onSubjectChange: (subject: string) => void;
  onTopicChange: (topic: string) => void;
  subjectRequired?: boolean;
  topicRequired?: boolean;
  disabled?: boolean;
  subjectLabel?: string;
  topicLabel?: string;
};

export function PlatformSubjectTopicSelect({
  subject,
  topic,
  onSubjectChange,
  onTopicChange,
  subjectRequired = true,
  topicRequired = true,
  disabled = false,
  subjectLabel = 'Subject',
  topicLabel = 'Topic / lesson',
}: PlatformSubjectTopicSelectProps) {
  const [tree, setTree] = useState<SubjectNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await platformQuestionsService.subjects();
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!cancelled) {
            setTree([]);
            setLoadError(json.error || 'Could not load subjects');
          }
          return;
        }
        if (!cancelled) {
          setTree(json.data?.subjects ?? []);
        }
      } catch {
        if (!cancelled) {
          setTree([]);
          setLoadError('Could not load subjects');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const subjectOptions = useMemo(() => {
    const names = tree.map((n) => n.subject);
    if (subject && !names.includes(subject)) {
      return [...names, subject].sort((a, b) => a.localeCompare(b));
    }
    return names;
  }, [tree, subject]);

  const topicOptions = useMemo(() => {
    const node = tree.find((n) => n.subject === subject);
    const names = node?.topics.map((t) => t.topic) ?? [];
    if (topic && !names.includes(topic)) {
      return [...names, topic].sort((a, b) => a.localeCompare(b));
    }
    return names;
  }, [tree, subject, topic]);

  const noSubjects = !loading && subjectOptions.length === 0;

  return (
    <>
      <div>
        <label className="mb-1 block text-sm font-medium">
          {subjectLabel}
          {subjectRequired ? ' *' : ''}
        </label>
        <Select
          value={subject || undefined}
          onValueChange={(value) => {
            onSubjectChange(value);
            onTopicChange('');
          }}
          disabled={disabled || loading || noSubjects}
          required={subjectRequired}
        >
          <SelectTrigger>
            <SelectValue
              placeholder={
                loading
                  ? 'Loading subjects...'
                  : noSubjects
                    ? 'No saved subjects'
                    : 'Select subject'
              }
            />
          </SelectTrigger>
          <SelectContent>
            {subjectOptions.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          {topicLabel}
          {topicRequired ? ' *' : ''}
        </label>
        <Select
          value={topic || undefined}
          onValueChange={onTopicChange}
          disabled={disabled || loading || !subject || topicOptions.length === 0}
          required={topicRequired}
        >
          <SelectTrigger>
            <SelectValue
              placeholder={
                !subject
                  ? 'Select a subject first'
                  : topicOptions.length === 0
                    ? 'No lessons/topics for this subject'
                    : 'Select topic / lesson'
              }
            />
          </SelectTrigger>
          <SelectContent>
            {topicOptions.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loadError ? (
        <p className="col-span-full text-xs text-destructive">{loadError}</p>
      ) : null}
      {noSubjects ? (
        <p className="col-span-full text-xs text-muted-foreground">
          Add batch subjects and lessons first, or save questions under an existing subject/topic.
        </p>
      ) : null}
    </>
  );
}

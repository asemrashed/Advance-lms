'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AttractiveTextarea } from '@/components/ui/attractive-textarea';
import { platformQuestionsService } from '@/services/platformQuestionsService';
import { LuKey, LuClock } from 'react-icons/lu';
import SubjectGradeSelect, {
  type SubjectGradeValue,
} from '@/components/platform-question-bank/SubjectGradeSelect';

type AccessSummary = {
  hasActiveGrant: boolean;
  activeGrant?: { expiresAt?: string; grantedAt?: string } | null;
  pendingRequest?: { _id: string; createdAt?: string; isPaid?: boolean } | null;
  paidAccessEnabled?: boolean;
  paidAccessFee?: number;
};

interface Props {
  onAccessChanged: () => void;
}

export default function PlatformInstructorAccessBanner({ onAccessChanged }: Props) {
  const [summary, setSummary] = useState<AccessSummary | null>(null);
  const [note, setNote] = useState('');
  const [subjectGrade, setSubjectGrade] = useState<SubjectGradeValue>({
    subjectId: '',
    subjectCode: '',
    subjectName: '',
    grade: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const res = await platformQuestionsService.listAccessRequests('limit=1');
    if (!res.ok) return;
    const json = await res.json();
    setSummary(json.data?.summary || null);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const payForAccess = async () => {
    setError('');
    setBusy(true);
    try {
      const res = await platformQuestionsService.payForAdminQbAccess();
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || 'Could not start payment');
        return;
      }
      const url = json.data?.checkout_url;
      if (url) window.location.href = url;
    } finally {
      setBusy(false);
    }
  };

  const requestAccess = async () => {
    setError('');
    setBusy(true);
    try {
      const res = await platformQuestionsService.requestAccess({
        note: note.trim() || undefined,
        subjectId: subjectGrade.subjectId || undefined,
        subjectCode: subjectGrade.subjectCode || undefined,
        subjectName: subjectGrade.subjectName || undefined,
        grade: subjectGrade.grade || undefined,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || 'Could not submit request');
        return;
      }
      setNote('');
      await load();
      onAccessChanged();
    } finally {
      setBusy(false);
    }
  };

  if (!summary) return null;

  if (summary.hasActiveGrant && summary.activeGrant) {
    const exp = summary.activeGrant.expiresAt
      ? new Date(summary.activeGrant.expiresAt).toLocaleDateString()
      : null;
    return (
      <Card className="mb-4 flex items-start gap-3 border-green-200 bg-green-50/80 p-3 dark:border-green-900 dark:bg-green-950/30">
        <LuKey className="mt-0.5 shrink-0 text-green-700" size={18} />
        <div>
          <p className="text-sm font-medium text-green-900 dark:text-green-100">
            Admin question bank access active
          </p>
          <p className="text-xs text-green-800/80 dark:text-green-200/80">
            You can browse admin platform questions{exp ? ` until ${exp}` : ''}. Editing is limited to your own questions.
          </p>
        </div>
      </Card>
    );
  }

  if (summary.pendingRequest) {
    return (
      <Card className="mb-4 flex items-start gap-3 border-amber-200 bg-amber-50/80 p-3 dark:border-amber-900 dark:bg-amber-950/30">
        <LuClock className="mt-0.5 shrink-0 text-amber-700" size={18} />
        <div>
          <p className="text-sm font-medium">Access request pending</p>
          <p className="text-xs text-muted-foreground">
            An admin will review your request to use the admin platform question bank.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="mb-4 space-y-3 p-4">
      <div>
        <p className="text-sm font-medium">Request admin question bank access</p>
        <p className="text-xs text-muted-foreground">
          Browse (read-only) admin platform questions after approval. Your own questions are always available.
        </p>
      </div>
      <SubjectGradeSelect value={subjectGrade} onChange={setSubjectGrade} />
      <AttractiveTextarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note for admin..."
        rows={2}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {summary.paidAccessEnabled && summary.paidAccessFee ? (
          <Button size="sm" disabled={busy} onClick={payForAccess}>
            Pay ৳{summary.paidAccessFee} for instant access
          </Button>
        ) : null}
        <Button size="sm" variant="outline" disabled={busy} onClick={requestAccess}>
          Request free access (admin approval)
        </Button>
      </div>
    </Card>
  );
}

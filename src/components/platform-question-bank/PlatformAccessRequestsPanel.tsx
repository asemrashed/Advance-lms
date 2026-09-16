'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { platformQuestionsService } from '@/services/platformQuestionsService';
import AdminGiveAccessModal from '@/components/platform-question-bank/AdminGiveAccessModal';
import { LuKey, LuRefreshCw } from 'react-icons/lu';

type AccessRequestRow = {
  _id: string;
  requesterId: string;
  requesterName?: string;
  requesterEmail?: string;
  status: 'pending' | 'approved' | 'rejected';
  scopeType?: 'full' | 'subject' | 'topics';
  topics?: string[];
  subjectName?: string;
  subjectCode?: string;
  grade?: string;
  isPaid: boolean;
  amount?: number;
  grantedAt?: string;
  expiresAt?: string;
  note?: string;
  createdAt?: string;
  source?: string;
  copiedCount?: number;
};

function scopeLabel(r: AccessRequestRow) {
  if (!r.scopeType || r.scopeType === 'full') return 'Full Platform QB';
  const sub = r.subjectName || r.subjectCode || 'Subject';
  if (r.scopeType === 'topics' && r.topics?.length) {
    return `${sub} · ${r.topics.length} topic(s)`;
  }
  return `${sub} (subject)`;
}

export default function PlatformAccessRequestsPanel() {
  const [tab, setTab] = useState<'pending' | 'access'>('pending');
  const [requests, setRequests] = useState<AccessRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [approveDays, setApproveDays] = useState<Record<string, string>>({});
  const [showGiveAccess, setShowGiveAccess] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (tab === 'access') {
        params.set('status', 'approved');
      } else if (statusFilter !== 'all') {
        params.set('status', statusFilter);
      }
      if (search.trim()) params.set('search', search.trim());
      const res = await platformQuestionsService.listAccessRequests(params.toString());
      if (res.ok) {
        const json = await res.json();
        setRequests(json.data?.requests || []);
      } else {
        setRequests([]);
      }
    } finally {
      setLoading(false);
    }
  }, [tab, statusFilter, search]);

  useEffect(() => {
    load();
  }, [load]);

  const patch = async (id: string, status: 'approved' | 'rejected') => {
    setBusyId(id);
    try {
      const body: {
        status: 'approved' | 'rejected';
        expiresInDays?: number;
      } = { status };
      if (status === 'approved') {
        const days = Number.parseInt(approveDays[id] || '90', 10);
        if (Number.isFinite(days) && days > 0) body.expiresInDays = days;
      }
      const res = await platformQuestionsService.patchAccessRequest(id, body);
      if (res.ok) await load();
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
          <button
            type="button"
            onClick={() => {
              setTab('pending');
              setStatusFilter('pending');
            }}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
              tab === 'pending' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Access requests
          </button>
          <button
            type="button"
            onClick={() => setTab('access')}
            className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
              tab === 'access' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Access given
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {tab === 'access' && (
            <Button size="sm" onClick={() => setShowGiveAccess(true)}>
              <LuKey className="mr-1.5 h-3.5 w-3.5" />
              Give Access
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => load()}>
            <LuRefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      <Card className="flex flex-wrap items-center gap-2 p-3">
        {tab === 'pending' && (
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        )}
        <Input
          className="max-w-xs"
          placeholder="Filter by subject, code, note…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Card>

      {loading ? (
        <p className="py-8 text-center text-muted-foreground">Loading…</p>
      ) : requests.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          {tab === 'access' ? 'No instructors with access yet.' : 'No access requests.'}
        </p>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <Card key={r._id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{r.requesterName || r.requesterId}</p>
                  {r.requesterEmail && (
                    <p className="text-xs text-muted-foreground">{r.requesterEmail}</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {scopeLabel(r)}
                    {r.grade ? ` · Grade ${r.grade}` : ''}
                    {r.source === 'admin_grant' ? ' · Admin grant' : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Requested {r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}
                  </p>
                  {r.note && <p className="mt-1 text-sm text-muted-foreground">{r.note}</p>}
                  {r.isPaid && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Paid via SSLCommerz{r.amount != null ? ` · ৳${r.amount}` : ''}
                    </p>
                  )}
                  {r.copiedCount != null && r.copiedCount > 0 && (
                    <p className="mt-1 text-xs text-emerald-700">
                      Legacy bulk copy: {r.copiedCount} question(s)
                    </p>
                  )}
                  {r.status === 'approved' && (r.copiedCount == null || r.copiedCount === 0) && (
                    <p className="mt-1 text-xs text-sky-700">
                      Shared access — instructors use platform originals; edit creates a private copy
                    </p>
                  )}
                </div>
                <Badge
                  variant={
                    r.status === 'approved'
                      ? 'default'
                      : r.status === 'rejected'
                        ? 'destructive'
                        : 'secondary'
                  }
                >
                  {r.status}
                </Badge>
              </div>
              {r.status === 'approved' && r.expiresAt && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Expires {new Date(r.expiresAt).toLocaleDateString()}
                  {r.grantedAt ? ` · Granted ${new Date(r.grantedAt).toLocaleDateString()}` : ''}
                </p>
              )}
              {r.status === 'pending' && tab === 'pending' && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <label className="text-xs text-muted-foreground">Grant days</label>
                  <Input
                    className="h-8 w-20"
                    type="number"
                    min={1}
                    value={approveDays[r._id] ?? '90'}
                    onChange={(e) =>
                      setApproveDays((prev) => ({ ...prev, [r._id]: e.target.value }))
                    }
                  />
                  <Button
                    size="sm"
                    disabled={busyId === r._id}
                    onClick={() => patch(r._id, 'approved')}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busyId === r._id}
                    onClick={() => patch(r._id, 'rejected')}
                  >
                    Reject
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <AdminGiveAccessModal
        open={showGiveAccess}
        onClose={() => setShowGiveAccess(false)}
        onGranted={() => {
          setTab('access');
          void load();
        }}
      />
    </div>
  );
}

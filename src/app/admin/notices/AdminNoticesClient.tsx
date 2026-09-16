'use client';

import { useCallback, useEffect, useState } from 'react';
import { AdminRoleShell } from '@/components/role-area/AdminRoleShell';
import PageSection from '@/components/PageSection';
import WelcomeSection from '@/components/WelcomeSection';
import AdminPageWrapper from '@/components/AdminPageWrapper';
import ConfirmModal from '@/components/ui/confirm-modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AttractiveInput } from '@/components/ui/attractive-input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { NoticePostPanel } from '@/components/notices/NoticePostPanel';
import {
  audienceScopeLabel,
  categoryBadgeClass,
  categoryLabel,
  formatNoticeDate,
} from '@/components/notices/noticeUiUtils';
import { noticesService } from '@/services/noticesService';
import { teachersStaffService } from '@/services/teachersStaffService';
import type { NoticeRow } from '@/types/notice';
import { LuPencil, LuTrash2, LuPin } from 'react-icons/lu';

function teacherName(row: Record<string, unknown>) {
  return String(row.name ?? '').trim() || String(row.email ?? 'Teacher');
}

export default function AdminNoticesClient() {
  const [notices, setNotices] = useState<NoticeRow[]>([]);
  const [instructors, setInstructors] = useState<Array<{ _id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [editing, setEditing] = useState<NoticeRow | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editPinned, setEditPinned] = useState(false);
  const [editActive, setEditActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<NoticeRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50', page: '1' });
      if (categoryFilter !== 'all') params.set('category', categoryFilter);
      const { notices: rows } = await noticesService.list(params.toString());
      setNotices(rows);
    } finally {
      setLoading(false);
    }
  }, [categoryFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void (async () => {
      const res = await teachersStaffService.listTeachers('limit=200&page=1');
      const data = await res.json();
      const teachers = data?.data?.teachers ?? data?.teachers ?? [];
      if (Array.isArray(teachers)) {
        setInstructors(
          teachers.map((t: Record<string, unknown>) => ({
            _id: String(t._id),
            name: teacherName(t),
          })),
        );
      }
    })();
  }, []);

  const openEdit = (notice: NoticeRow) => {
    setEditing(notice);
    setEditTitle(notice.title);
    setEditBody(notice.body);
    setEditPinned(notice.isPinned);
    setEditActive(notice.isActive);
  };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const { res } = await noticesService.update(editing._id, {
        title: editTitle.trim(),
        body: editBody.trim(),
        isPinned: editPinned,
        isActive: editActive,
      });
      if (res.ok) {
        setEditing(null);
        await load();
      }
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await noticesService.remove(deleteTarget._id);
      setDeleteTarget(null);
      await load();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <AdminRoleShell>
      <AdminPageWrapper>
        <WelcomeSection
          title="Notice board"
          description="Create and moderate platform, subject, and teacher announcements"
        />

        <NoticePostPanel role="admin" instructors={instructors} onPosted={load} />

        <PageSection title="All notices" className="mt-6">
          <div className="mb-4 flex flex-wrap gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                <SelectItem value="admin">Platform</SelectItem>
                <SelectItem value="subject">Subject</SelectItem>
                <SelectItem value="teacher">Teacher</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              Refresh
            </Button>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : notices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notices found.</p>
          ) : (
            <ul className="space-y-3">
              {notices.map((notice) => {
                const scopeLabel = audienceScopeLabel(notice);
                return (
                <li
                  key={notice._id}
                  className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{notice.title}</span>
                      <Badge className={categoryBadgeClass(notice.category)}>
                        {categoryLabel(notice.category)}
                      </Badge>
                      {notice.isPinned ? (
                        <Badge variant="secondary">
                          <LuPin className="mr-1 inline h-3 w-3" />
                          Pinned
                        </Badge>
                      ) : null}
                      {!notice.isActive ? (
                        <Badge variant="outline">Inactive</Badge>
                      ) : null}
                      {scopeLabel ? (
                        <Badge variant="outline">{scopeLabel}</Badge>
                      ) : null}
                    </div>
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {notice.body}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {notice.postedBy.name} · {formatNoticeDate(notice.createdAt)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(notice)}>
                      <LuPencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDeleteTarget(notice)}
                    >
                      <LuTrash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
                );
              })}
            </ul>
          )}
        </PageSection>

        <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit notice</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <AttractiveInput
                label="Title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />
              <div>
                <label className="mb-1 block text-sm font-medium">Message</label>
                <textarea
                  className="min-h-[120px] w-full rounded-lg border px-3 py-2 text-sm"
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editPinned}
                  onChange={(e) => setEditPinned(e.target.checked)}
                />
                Pinned
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editActive}
                  onChange={(e) => setEditActive(e.target.checked)}
                />
                Active
              </label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button onClick={() => void saveEdit()} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <ConfirmModal
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => void confirmDelete()}
          title="Deactivate notice?"
          description="This notice will be hidden from students. You can reactivate it by editing."
          confirmText={deleting ? 'Removing…' : 'Deactivate'}
          loading={deleting}
          variant="danger"
        />
      </AdminPageWrapper>
    </AdminRoleShell>
  );
}

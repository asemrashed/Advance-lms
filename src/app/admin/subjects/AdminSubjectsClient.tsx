'use client';

import { useEffect, useState } from 'react';
import { useSubjects } from '@/hooks/useSubjects';
import { AdminRoleShell } from '@/components/role-area/AdminRoleShell';
import AdminPageWrapper from '@/components/AdminPageWrapper';
import PageSection from '@/components/PageSection';
import WelcomeSection from '@/components/WelcomeSection';
import SubjectModal from '@/components/SubjectModal';
import ConfirmModal from '@/components/ui/confirm-modal';
import { Button } from '@/components/ui/button';
import { AttractiveInput } from '@/components/ui/attractive-input';
import type { Subject } from '@/types/subject';
import { GradeFilterSelect } from '@/components/ui/GradeFilterSelect';
import { formatGradeLabel } from '@/lib/courseLabel';
import { LuSearch, LuPlus, LuPencil, LuTrash2 } from 'react-icons/lu';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';

export default function AdminSubjectsClient() {
  const {
    subjects,
    loading,
    error,
    stats,
    fetchSubjects,
    createSubject,
    updateSubject,
    deleteSubject,
  } = useSubjects({ limit: 100, sortBy: 'name', includeCounts: true });

  const { can } = useAdminPermissions();
  const canMutate = can("create_subjects");
  const [search, setSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [toDelete, setToDelete] = useState<Subject | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchSubjects({
      limit: 100,
      search: search || undefined,
      grade: gradeFilter !== 'all' ? gradeFilter : undefined,
      sortBy: 'name',
    });
  }, [search, gradeFilter, fetchSubjects]);

  const filtered = subjects;

  return (
    <AdminRoleShell>
      <AdminPageWrapper>
        <WelcomeSection
          title="Subjects"
          description="Manage syllabus subjects with class/grade and chapter lists used by courses and the question bank"
        />
        <PageSection>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <GradeFilterSelect
              value={gradeFilter}
              onChange={setGradeFilter}
              className="w-full max-w-[200px]"
            />
            <div className="relative min-w-[220px] flex-1 max-w-md">
              <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <AttractiveInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or code…"
                className="pl-9"
              />
            </div>
            {canMutate ? (
            <Button onClick={() => { setEditing(null); setShowForm(true); }}>
              <LuPlus className="mr-1" size={16} /> Add subject
            </Button>
            ) : null}
          </div>

          {stats && (
            <p className="mb-3 text-sm text-muted-foreground">
              {stats.totalSubjects} subjects · {stats.activeSubjects} active · {stats.subjectsWithCourses} used in courses
            </p>
          )}
          {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Class / grade</th>
                  <th className="px-4 py-3 font-medium">Chapters</th>
                  <th className="px-4 py-3 font-medium">Courses</th>
                  <th className="px-4 py-3 font-medium">Questions</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && !filtered.length ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                ) : null}
                {!loading && !filtered.length ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                      No subjects yet. Add Mathematics (4024), Physics (9702), etc.
                    </td>
                  </tr>
                ) : null}
                {filtered.map((s) => (
                  <tr key={s._id} className="border-t">
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3 font-mono">{s.code}</td>
                    <td className="px-4 py-3">{s.grade ? formatGradeLabel(s.grade) : '—'}</td>
                    <td className="px-4 py-3">{s.chapters?.length ?? 0}</td>
                    <td className="px-4 py-3">{s.courseCount ?? 0}</td>
                    <td className="px-4 py-3">{s.questionCount ?? 0}</td>
                    <td className="px-4 py-3">{s.isActive ? 'Active' : 'Inactive'}</td>
                    <td className="px-4 py-3 text-right">
                      {canMutate ? (
                        <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setEditing(s); setShowForm(true); }}
                      >
                        <LuPencil size={14} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setToDelete(s)}
                      >
                        <LuTrash2 size={14} className="text-destructive" />
                      </Button>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </PageSection>

        <SubjectModal
          open={showForm}
          subject={editing}
          onClose={() => setShowForm(false)}
          onSuccess={() => { setShowForm(false); fetchSubjects({ limit: 100, search: search || undefined }); }}
          createSubject={createSubject}
          updateSubject={updateSubject}
        />

        <ConfirmModal
          open={!!toDelete}
          onClose={() => setToDelete(null)}
          onConfirm={async () => {
            if (!toDelete) return;
            setDeleting(true);
            await deleteSubject(toDelete._id);
            setDeleting(false);
            setToDelete(null);
          }}
          title="Delete subject?"
          description={`Remove ${toDelete?.name} (${toDelete?.code})? Existing courses and questions keep their stored subject labels.`}
          confirmText="Delete"
          loading={deleting}
        />
      </AdminPageWrapper>
    </AdminRoleShell>
  );
}

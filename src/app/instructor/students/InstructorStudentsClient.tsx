'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { InstructorRoleShell } from '@/components/role-area/InstructorRoleShell';
import StudentModal from '@/components/StudentModal';
import ConfirmModal from '@/components/ui/confirm-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Student } from '@/types/student';
import { studentsStaffService } from '@/services/studentsStaffService';
import { enrollmentsStaffService } from '@/services/enrollmentsStaffService';
import { batchesService, type BatchRecord } from '@/services/batchesService';
import {
  InstructorCard,
  InstructorEmptyState,
  InstructorFilterTabs,
  InstructorLoadingState,
  InstructorPage,
  InstructorProgressCell,
  InstructorStatusBadge,
  InstructorTopbar,
} from '@/components/instructor-panel/InstructorPanelPrimitives';
import {
  LuPencil as Pencil,
  LuSearch as Search,
  LuTrash2 as Trash,
} from 'react-icons/lu';

type EnrollmentRow = {
  student: string;
  course: string;
  progress?: number;
  paymentStatus?: string;
  paymentAmount?: number;
  batchId?: string;
  batchName?: string;
  courseType?: string;
  courseLuInfo?: { _id?: string; title?: string; courseType?: string };
};

const PAGE_SIZE = 10;

function InstructorStudentsPageContent() {
  const [students, setStudents] = useState<Student[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [batches, setBatches] = useState<BatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [course, setCourse] = useState('all');
  const [batch, setBatch] = useState('all');
  const [page, setPage] = useState(1);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [studentResponse, enrollmentResponse, batchesRes] = await Promise.all([
        studentsStaffService.listInstructorStudents('page=1&limit=500'),
        enrollmentsStaffService.listInstructorEnrollments('page=1&limit=100'),
        batchesService.listBatches('limit=200'),
      ]);
      const [studentData, enrollmentData] = await Promise.all([
        studentResponse.json(),
        enrollmentResponse.json(),
      ]);
      if (studentResponse.ok) {
        setStudents(studentData.students || []);
      }
      if (enrollmentResponse.ok) {
        const firstPage = enrollmentData.data?.enrollments || [];
        const pageCount = Number(enrollmentData.data?.pagination?.pages || 1);
        if (pageCount > 1) {
          const responses = await Promise.all(
            Array.from({ length: pageCount - 1 }, (_, index) =>
              enrollmentsStaffService.listInstructorEnrollments(
                `page=${index + 2}&limit=100`,
              ),
            ),
          );
          const remainingPages = await Promise.all(
            responses.map(async (response) => {
              if (!response.ok) return [];
              const data = await response.json();
              return data.data?.enrollments || [];
            }),
          );
          setEnrollments([...firstPage, ...remainingPages.flat()]);
        } else {
          setEnrollments(firstPage);
        }
      }
      if (batchesRes.success && batchesRes.data?.batches) {
        setBatches(batchesRes.data.batches);
      }
    } catch (error) {
      console.error('Error fetching instructor students:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const enrollmentMap = useMemo(() => {
    const map = new Map<string, EnrollmentRow[]>();
    enrollments.forEach((row) => {
      map.set(row.student, [...(map.get(row.student) || []), row]);
    });
    return map;
  }, [enrollments]);

  const courseTabs = useMemo(() => {
    const available = new Map<string, string>();
    enrollments.forEach((row) => {
      const id = row.courseLuInfo?._id || row.course;
      const title = row.courseLuInfo?.title;
      if (id && title) available.set(id, title);
    });
    return [
      { id: 'all', label: 'All Courses', count: students.length },
      ...Array.from(available, ([id, label]) => ({
        id,
        label,
        count: new Set(
          enrollments.filter((row) => row.course === id).map((row) => row.student),
        ).size,
      })),
    ];
  }, [enrollments, students.length]);

  const courseBatches = useMemo(() => {
    if (course === 'all') return batches;
    return batches.filter((b) => b.courseId === course);
  }, [batches, course]);

  const filteredStudents = useMemo(() => {
    const term = search.trim().toLowerCase();
    return students.filter((student) => {
      const rows = enrollmentMap.get(student._id) || [];
      const matchesCourse =
        course === 'all' || rows.some((row) => row.course === course);
      const matchesBatch =
        batch === 'all' ||
        rows.some((row) => row.batchId === batch);
      const fullName = student.name?.trim() || '';
      const matchesSearch =
        !term ||
        fullName.toLowerCase().includes(term) ||
        student.email?.toLowerCase().includes(term) ||
        student.phone?.toLowerCase().includes(term);
      return matchesCourse && matchesBatch && matchesSearch;
    });
  }, [batch, course, enrollmentMap, search, students]);

  const pages = Math.ceil(filteredStudents.length / PAGE_SIZE);
  const visibleStudents = filteredStudents.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );
  const selectCourse = (id: string) => {
    setCourse(id);
    setBatch('all');
    setPage(1);
  };

  const confirmDeleteStudent = async () => {
    if (!studentToDelete) return;
    try {
      setDeleting(true);
      const response = await studentsStaffService.deleteStudent(studentToDelete._id);
      if (response.ok) {
        setStudentToDelete(null);
        await fetchData();
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <InstructorRoleShell>
      <InstructorPage>
        <InstructorTopbar
          title="Students"
          subtitle="All students enrolled across your live and recorded courses"
        />

        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3">
          <div className="min-w-0 overflow-x-auto pb-1">
            <InstructorFilterTabs tabs={courseTabs} value={course} onChange={selectCourse} />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {courseBatches.length > 0 ? (
              <select
                value={batch}
                onChange={(event) => {
                  setBatch(event.target.value);
                  setPage(1);
                }}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 sm:w-56"
                aria-label="Filter by batch"
              >
                <option value="all">All batches</option>
                {courseBatches.map((item) => (
                  <option key={item._id} value={item._id}>
                    {item.name}
                  </option>
                ))}
              </select>
            ) : null}
            <div className="relative w-full sm:ml-auto sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search by name..."
                className="pl-9"
              />
            </div>
          </div>
        </div>

        <InstructorCard
          title="Enrolled Students"
          actions={
            <span className="text-xs text-muted-foreground">
              {filteredStudents.length} student{filteredStudents.length === 1 ? '' : 's'}
            </span>
          }
        >
          {loading ? (
            <InstructorLoadingState label="Loading students…" />
          ) : visibleStudents.length === 0 ? (
            <InstructorEmptyState message="No students match these filters." />
          ) : (
            <div className="-mx-4 overflow-x-auto sm:-mx-5">
              <table className="w-full min-w-[960px] text-left">
                <thead>
                  <tr className="border-b border-border bg-muted/35 text-[11px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-5 py-3 font-semibold">Student</th>
                    <th className="px-4 py-3 font-semibold">Enrolled Courses</th>
                    <th className="px-4 py-3 font-semibold">Attendance</th>
                    <th className="px-4 py-3 font-semibold">Progress</th>
                    <th className="px-4 py-3 font-semibold">Avg Grade</th>
                    <th className="px-4 py-3 font-semibold">Payment</th>
                    <th className="px-5 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleStudents.map((student) => {
                    const rows = enrollmentMap.get(student._id) || [];
                    const knownProgress = rows
                      .map((row) => row.progress)
                      .filter((value): value is number => typeof value === 'number');
                    const progress = knownProgress.length
                      ? knownProgress.reduce((sum, value) => sum + value, 0) / knownProgress.length
                      : null;
                    const paymentStatuses = rows
                      .map((row) => row.paymentStatus)
                      .filter(Boolean) as string[];
                    const allPaid =
                      paymentStatuses.length > 0 &&
                      paymentStatuses.every((status) => status === 'paid');
                    const name = student.name?.trim() || 'Student';
                    return (
                      <tr key={student._id} className="border-b border-border last:border-0 hover:bg-blue-50/40">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 font-bold text-blue-700">
                              {student.avatar ? (
                                <Image src={student.avatar} alt="" fill className="object-cover" />
                              ) : (
                                name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-foreground">{name}</div>
                              <div className="max-w-52 truncate text-xs text-muted-foreground">
                                {student.email || student.phone || '—'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex max-w-72 flex-wrap gap-1">
                            {rows.length ? rows.map((row) => (
                              <span
                                key={`${student._id}-${row.course}-${row.batchId || 'course'}`}
                                className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700"
                              >
                                {row.courseLuInfo?.title || 'Course'}
                                {row.batchName ? ` · ${row.batchName}` : ''}
                              </span>
                            )) : '—'}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-muted-foreground">—</td>
                        <td className="px-4 py-4">
                          {progress === null ? '—' : <InstructorProgressCell value={progress} />}
                        </td>
                        <td className="px-4 py-4 text-sm text-muted-foreground">—</td>
                        <td className="px-4 py-4">
                          {paymentStatuses.length ? (
                            <InstructorStatusBadge
                              status={allPaid ? 'success' : 'warning'}
                              label={allPaid ? 'Paid' : 'Due'}
                            />
                          ) : '—'}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => setEditingStudent(student)} aria-label={`Edit ${name}`}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setStudentToDelete(student)} aria-label={`Delete ${name}`} className="text-red-600 hover:text-red-700">
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {pages > 1 ? (
            <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
              <span className="text-xs text-muted-foreground">Page {page} of {pages}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</Button>
                <Button variant="outline" size="sm" disabled={page === pages} onClick={() => setPage((value) => value + 1)}>Next</Button>
              </div>
            </div>
          ) : null}
        </InstructorCard>

        <StudentModal
          open={Boolean(editingStudent)}
          student={editingStudent}
          onClose={() => setEditingStudent(null)}
          onSuccess={() => {
            setEditingStudent(null);
            void fetchData();
          }}
          apiEndpoint="/api/instructor/students"
        />
        <ConfirmModal
          open={Boolean(studentToDelete)}
          onClose={() => setStudentToDelete(null)}
          onConfirm={confirmDeleteStudent}
          title="Delete Student"
          description={`Are you sure you want to delete ${studentToDelete?.name || 'this student'}? This action cannot be undone.`}
          confirmText="Delete Student"
          cancelText="Cancel"
          variant="danger"
          loading={deleting}
        />
      </InstructorPage>
    </InstructorRoleShell>
  );
}

export default function InstructorStudentsPage() {
  return <InstructorStudentsPageContent />;
}

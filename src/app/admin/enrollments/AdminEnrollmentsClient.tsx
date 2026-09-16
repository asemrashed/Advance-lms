'use client';

import { useState, useEffect } from 'react';
import { AdminRoleShell } from '@/components/role-area/AdminRoleShell';
import EnrollmentDataTable from '@/components/EnrollmentDataTable';
import EnrollmentModal from '@/components/EnrollmentModal';
import PageSection from '@/components/PageSection';
import WelcomeSection from '@/components/WelcomeSection';
import ConfirmModal from '@/components/ui/confirm-modal';
import AdminPageWrapper from '@/components/AdminPageWrapper';
import { Enrollment, EnrollmentStats } from '@/types/enrollment';
import { EnrollmentOverviewStats } from '@/components/staff/EnrollmentOverviewStats';
import { Button } from '@/components/ui/button';
import { enrollmentsStaffService } from '@/services/enrollmentsStaffService';
import { coursesStaffService } from '@/services/coursesStaffService';
import { EnrollRequestsPanel } from '@/components/enrollments/EnrollRequestsPanel';
import { DiscountRequestsPanel } from '@/components/enrollments/DiscountRequestsPanel';
import { EnrollmentStaffFilters } from '@/components/staff/EnrollmentStaffFilters';
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import { INSTRUCTOR_GRACE_DAYS } from '@/lib/subscription/plan';
import { LuPlus as Plus, LuCalendarClock } from 'react-icons/lu';

function EnrollmentsPageContent() {
  const { can } = useAdminPermissions();
  const canEnroll = can("enroll_students");
  const canManage = can("manage_enrollments");
  const canMutate = canEnroll || canManage;
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [stats, setStats] = useState<EnrollmentStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
    hasNext: false,
    hasPrev: false,
  });
  const [showForm, setShowForm] = useState(false);
  const [editingEnrollment, setEditingEnrollment] = useState<Enrollment | null>(null);
  const [searchDraft, setSearchDraft] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [enrollmentToDelete, setEnrollmentToDelete] = useState<Enrollment | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    page: 1,
    limit: 10,
  });
  const [courseFilter, setCourseFilter] = useState('all');
  const [courses, setCourses] = useState<Array<{ _id: string; title: string }>>([]);

  const fetchEnrollments = async () => {
    try {
      setLoading(true);
      setError(null);

      const queryParams = new URLSearchParams({
        page: filters.page.toString(),
        limit: filters.limit.toString(),
        ...(filters.search && { search: filters.search }),
        ...(courseFilter !== 'all' && { course: courseFilter }),
      });

      const response = await enrollmentsStaffService.listAdminEnrollments(
        queryParams.toString(),
      );

      if (response.ok) {
        const data = await response.json();
        setEnrollments(data.data?.enrollments || []);
        setStats(data.data?.stats || null);
        setPagination(
          data.data?.pagination || {
            page: 1,
            limit: 10,
            total: 0,
            pages: 0,
            hasNext: false,
            hasPrev: false,
          },
        );
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch enrollments');
        setEnrollments([]);
        setStats(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch enrollments');
      setEnrollments([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnrollments();
  }, [filters, courseFilter]);

  useEffect(() => {
    const loadCourses = async () => {
      try {
        const response = await coursesStaffService.listCourses('limit=500&page=1');
        const data = await response.json();
        if (response.ok && data.data?.courses) {
          setCourses(data.data.courses);
        }
      } catch {
        /* ignore */
      }
    };
    loadCourses();
  }, []);

  const applySearch = () => {
    setFilters((prev) => ({ ...prev, search: searchDraft.trim(), page: 1 }));
  };

  const clearSearch = () => {
    setSearchDraft('');
    setFilters((prev) => ({ ...prev, search: '', page: 1 }));
  };

  const handleCourseFilterChange = (value: string) => {
    setCourseFilter(value);
    setFilters((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  const handleAddEnrollment = () => {
    setEditingEnrollment(null);
    setShowForm(true);
  };

  const handleViewEnrollment = (enrollment: Enrollment) => {
    setEditingEnrollment(enrollment);
    setShowForm(true);
  };

  const handleEditEnrollment = (enrollment: Enrollment) => {
    setEditingEnrollment(enrollment);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingEnrollment(null);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingEnrollment(null);
    fetchEnrollments();
  };

  const extendDues = async (row: Enrollment) => {
    const base =
      row.paymentDueAt && new Date(row.paymentDueAt) > new Date()
        ? new Date(row.paymentDueAt)
        : new Date();
    base.setDate(base.getDate() + INSTRUCTOR_GRACE_DAYS);
    await updateEnrollment(row._id, { paymentDueAt: base.toISOString() });
    fetchEnrollments();
  };

  const handleDeleteEnrollment = (enrollment: Enrollment) => {
    setEnrollmentToDelete(enrollment);
    setShowDeleteModal(true);
  };

  const confirmDeleteEnrollment = async () => {
    if (!enrollmentToDelete) return;

    setDeleting(true);
    try {
      const response = await enrollmentsStaffService.deleteAdminEnrollment(
        enrollmentToDelete._id,
      );

      if (response.ok) {
        fetchEnrollments();
        setShowDeleteModal(false);
        setEnrollmentToDelete(null);
      } else {
        const errorData = await response.json();
        console.error('Failed to delete enrollment:', errorData.error);
      }
    } catch (err) {
      console.error('Error deleting enrollment:', err);
    } finally {
      setDeleting(false);
    }
  };

  const cancelDeleteEnrollment = () => {
    setShowDeleteModal(false);
    setEnrollmentToDelete(null);
  };

  const createEnrollment = async (enrollmentData: unknown): Promise<Enrollment | null> => {
    try {
      const response = await enrollmentsStaffService.createAdminEnrollment(enrollmentData);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create enrollment');
      }

      if (typeof data.warning === 'string' && data.warning.trim()) {
        setError(data.warning);
      }

      return data.data;
    } catch (err) {
      console.error('Error creating enrollment:', err);
      return null;
    }
  };

  const updateEnrollment = async (
    id: string,
    enrollmentData: unknown,
  ): Promise<Enrollment | null> => {
    try {
      const response = await enrollmentsStaffService.updateAdminEnrollment(
        id,
        enrollmentData,
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update enrollment');
      }

      return data.data;
    } catch (err) {
      console.error('Error updating enrollment:', err);
      return null;
    }
  };

  return (
    <AdminRoleShell>
      <main className="relative z-10 p-2 sm:p-4">
        <WelcomeSection
          title="Enrollment Management"
          description="Manage student enrollments and track course progress"
        />

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <div className="text-red-600">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading enrollments</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div className="mb-2 sm:mb-4">
          <PageSection title="Overview" className="overflow-hidden">
            <EnrollmentOverviewStats stats={stats} loading={loading && !stats} />
          </PageSection>
        </div>

        <div className="mb-2 space-y-3 sm:mb-4">
          <EnrollRequestsPanel canReview={can("review_enrollment_requests")} />
          <DiscountRequestsPanel />
        </div>

        <PageSection
          title="Enrollments"
          description="Complete list of all student enrollments in the system"
          className="mb-2 overflow-hidden sm:mb-4"
        >
          <div className="mb-4 min-w-0">
            <EnrollmentStaffFilters
              searchDraft={searchDraft}
              onSearchDraftChange={setSearchDraft}
              onApplySearch={applySearch}
              onClearSearch={clearSearch}
              courseId={courseFilter}
              onCourseChange={handleCourseFilterChange}
              courses={courses}
              searchPlaceholder="Search enrollments..."
              loading={loading}
              extra={
                canEnroll ? (
                  <Button
                    onClick={handleAddEnrollment}
                    className="w-full min-w-0 text-white"
                    style={{
                      background: 'linear-gradient(135deg, #EC4899 0%, #A855F7 100%)',
                    }}
                  >
                    <Plus className="h-4 w-4" />
                    <span className="truncate">Add</span>
                  </Button>
                ) : null
              }
            />
          </div>
          <div className="w-full overflow-hidden">
            <EnrollmentDataTable
              enrollments={enrollments}
              loading={loading}
              onView={handleViewEnrollment}
              onEdit={canMutate ? handleEditEnrollment : undefined}
              onDelete={canManage ? handleDeleteEnrollment : undefined}
              pagination={pagination}
              onPageChange={handlePageChange}
              variant="table"
              extraActions={
                canMutate
                  ? [
                      {
                        key: "extend-dues",
                        label: "Extend dues",
                        icon: <LuCalendarClock className="h-4 w-4" />,
                        onClick: extendDues,
                        variant: "secondary" as const,
                      },
                    ]
                  : []
              }
            />
          </div>
        </PageSection>

        {canEnroll ? (
        <div className="fixed bottom-6 right-6 z-40 sm:hidden">
          <Button
            onClick={handleAddEnrollment}
            size="lg"
            className="rounded-full w-14 h-14 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            style={{
              background: 'linear-gradient(135deg, #EC4899 0%, #A855F7 100%)',
            }}
          >
            <Plus className="w-6 h-6" />
          </Button>
        </div>
        ) : null}

        <EnrollmentModal
          open={showForm}
          enrollment={editingEnrollment}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
          createEnrollment={createEnrollment}
          updateEnrollment={updateEnrollment}
        />

        <ConfirmModal
          open={showDeleteModal}
          onClose={cancelDeleteEnrollment}
          onConfirm={confirmDeleteEnrollment}
          title="Delete Enrollment"
          description="Are you sure you want to delete this enrollment? This action cannot be undone."
          confirmText="Delete Enrollment"
          cancelText="Cancel"
          variant="danger"
          loading={deleting}
        />
      </main>
    </AdminRoleShell>
  );
}

export default function EnrollmentsPage() {
  return (
    <AdminPageWrapper>
      <EnrollmentsPageContent />
    </AdminPageWrapper>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { AdminRoleShell } from '@/components/role-area/AdminRoleShell';
import TeacherDataTable from '@/components/TeacherDataTable';
import TeacherModal from '@/components/TeacherModal';
import TeacherDetailsModal from '@/components/TeacherDetailsModal';
import PageSection from '@/components/PageSection';
import WelcomeSection from '@/components/WelcomeSection';
import ConfirmModal from '@/components/ui/confirm-modal';
import AdminPageWrapper from '@/components/AdminPageWrapper';
import TeacherRequestsPanel from '@/components/TeacherRequestsPanel';
import { Teacher, TeacherFilters as TeacherFiltersType } from '@/types/teacher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { teachersStaffService } from '@/services/teachersStaffService';
import { LuPlus as Plus, LuSearch as Search, LuX as X } from 'react-icons/lu';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';

function TeachersPageContent() {
  const { can } = useAdminPermissions();
  const canMutate = can("manage_teachers");
  
  const [viewTab, setViewTab] = useState<'teachers' | 'requests'>('teachers');
  const [pendingCount, setPendingCount] = useState(0);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [viewingTeacher, setViewingTeacher] = useState<Teacher | null>(null);
  const [search, setSearch] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [teacherToDelete, setTeacherToDelete] = useState<Teacher | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    page: 1,
    limit: 10,
    status: 'approved' as const,
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  useEffect(() => {
    if (viewTab === 'teachers') {
      fetchTeachers();
    }
  }, [filters, viewTab]);

  useEffect(() => {
    fetchPendingCount();
  }, []);

  const fetchPendingCount = async () => {
    try {
      const params = new URLSearchParams({ status: 'pending', limit: '1' });
      const response = await teachersStaffService.listTeachers(params.toString());
      const data = await response.json();
      if (response.ok) {
        setPendingCount(data?.pagination?.total ?? 0);
      }
    } catch (error) {
      console.error('Error fetching pending count:', error);
    }
  };

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: filters.page.toString(),
        limit: filters.limit.toString(),
        status: filters.status,
        ...(filters.search && { search: filters.search })
      });

      const response = await teachersStaffService.listTeachers(queryParams.toString());
      const data = await response.json();

      if (response.ok) {
        setTeachers(Array.isArray(data?.teachers) ? data.teachers : []);
        setPagination(
          data?.pagination ?? {
            page: filters.page,
            limit: filters.limit,
            total: 0,
            pages: 0,
          },
        );
      } else {
        console.error('Failed to fetch teachers:', data.error);
      }
    } catch (error) {
      console.error('Error fetching teachers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (searchValue: string) => {
    setSearch(searchValue);
    setFilters(prev => ({ ...prev, search: searchValue, page: 1 }));
  };


  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handleAddTeacher = () => {
    setEditingTeacher(null);
    setShowForm(true);
  };

  const handleQuickSearch = () => {
    // Focus on the search input in the filters section
    const searchInput = document.querySelector('input[placeholder*="Search teachers"]') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
    }
  };

  const handleEditTeacher = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setShowForm(true);
  };

  const handleViewTeacher = (teacher: Teacher) => {
    setViewingTeacher(teacher);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingTeacher(null);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingTeacher(null);
    fetchTeachers();
    fetchPendingCount();
  };

  const handleDeleteTeacher = (teacher: Teacher) => {
    setTeacherToDelete(teacher);
    setShowDeleteModal(true);
  };

  const confirmDeleteTeacher = async () => {
    if (!teacherToDelete) return;

    setDeleting(true);
    try {
      const response = await teachersStaffService.deleteTeacher(teacherToDelete._id);

      const data = await response.json();

      if (response.ok) {
        console.log('Teacher deleted successfully');
        fetchTeachers();
        setShowDeleteModal(false);
        setTeacherToDelete(null);
      } else {
        console.error('Failed to delete teacher:', data.error);
      }
    } catch (error) {
      console.error('Error deleting teacher:', error);
    } finally {
      setDeleting(false);
    }
  };

  const cancelDeleteTeacher = () => {
    setShowDeleteModal(false);
    setTeacherToDelete(null);
  };


  return (
    <AdminRoleShell>
      <main className="relative z-10 p-2 sm:p-4">
        {/* Welcome Section */}
        <WelcomeSection 
          title="Teacher Management"
          description="Manage instructors and their information"
        />

        {/* View Tabs */}
        <div className="mb-4 flex flex-wrap gap-2">
          <Button
            variant={viewTab === 'teachers' ? 'default' : 'outline'}
            onClick={() => setViewTab('teachers')}
          >
            Teachers
          </Button>
          <Button
            variant={viewTab === 'requests' ? 'default' : 'outline'}
            onClick={() => setViewTab('requests')}
            className="relative"
          >
            Requests
            {pendingCount > 0 ? (
              <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 py-0.5 text-xs font-bold text-white">
                {pendingCount}
              </span>
            ) : null}
          </Button>
        </div>

        {viewTab === 'requests' ? (
          canMutate ? (
          <PageSection
            title="Instructor Requests"
            description="Review and approve instructor applications from the register page"
            className="mb-2 sm:mb-4"
          >
            <TeacherRequestsPanel
              onStatusChange={() => {
                fetchPendingCount();
                fetchTeachers();
              }}
            />
          </PageSection>
          ) : (
            <PageSection
              title="Instructor Requests"
              description="Only super admins can approve or reject instructor applications"
              className="mb-2 sm:mb-4"
            >
              <p className="p-4 text-sm text-muted-foreground">
                You can view teachers, but approving requests requires a super admin.
              </p>
            </PageSection>
          )
        ) : (
          <>
        {/* Teachers Table */}
        <PageSection 
          title="Teachers"
          description="Approved and managed instructors in the system"
          className="mb-2 sm:mb-4"
          actions={
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search teachers..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10 pr-10 w-full sm:w-64"
                  disabled={loading}
                />
                {search && (
                  <button
                    onClick={() => handleSearchChange('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {canMutate ? (
              <Button 
                onClick={handleAddTeacher}
                className="flex items-center gap-2 text-white w-full sm:w-auto transition-all duration-200"
                style={{
                  background: "linear-gradient(135deg, #EC4899 0%, #A855F7 100%)",
                  boxShadow: "0 4px 15px rgba(236, 72, 153, 0.3)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "linear-gradient(135deg, #DB2777 0%, #9333EA 100%)";
                  e.currentTarget.style.boxShadow = "0 6px 20px rgba(236, 72, 153, 0.4)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "linear-gradient(135deg, #EC4899 0%, #A855F7 100%)";
                  e.currentTarget.style.boxShadow = "0 4px 15px rgba(236, 72, 153, 0.3)";
                }}
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Teacher</span>
                <span className="sm:hidden">Add</span>
              </Button>
              ) : null}
            </div>
          }
        >
          <div className="w-full overflow-hidden">
            <TeacherDataTable
              teachers={teachers}
              loading={loading}
              onView={handleViewTeacher}
              onEdit={canMutate ? handleEditTeacher : undefined}
              onDelete={canMutate ? handleDeleteTeacher : undefined}
              pagination={pagination}
              onPageChange={handlePageChange}
              variant="table"
            />
          </div>
        </PageSection>
          </>
        )}

        {viewTab === 'teachers' && canMutate ? (
        <>
        {/* Floating Action Button for Mobile */}
        <div className="fixed bottom-6 right-6 z-40 sm:hidden">
          <Button
            onClick={handleAddTeacher}
            size="lg"
            className="rounded-full w-14 h-14 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            style={{
              background: "linear-gradient(135deg, #EC4899 0%, #A855F7 100%)",
              boxShadow: "0 4px 15px rgba(236, 72, 153, 0.3)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "linear-gradient(135deg, #DB2777 0%, #9333EA 100%)";
              e.currentTarget.style.boxShadow = "0 6px 20px rgba(236, 72, 153, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "linear-gradient(135deg, #EC4899 0%, #A855F7 100%)";
              e.currentTarget.style.boxShadow = "0 4px 15px rgba(236, 72, 153, 0.3)";
            }}
          >
            <Plus className="w-6 h-6" />
          </Button>
        </div>
        </>
        ) : null}

        {/* Teacher Modal */}
        <TeacherModal
          open={showForm}
          teacher={editingTeacher}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />

        <TeacherDetailsModal
          open={Boolean(viewingTeacher)}
          teacher={viewingTeacher}
          onClose={() => setViewingTeacher(null)}
        />

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          open={showDeleteModal}
          onClose={cancelDeleteTeacher}
          onConfirm={confirmDeleteTeacher}
          title="Delete Teacher"
          description={`Are you sure you want to delete ${teacherToDelete?.name || 'this teacher'}? This action cannot be undone.`}
          confirmText="Delete Teacher"
          cancelText="Cancel"
          variant="danger"
          loading={deleting}
        />
      </main>
    </AdminRoleShell>
  );
}

export default function TeachersPage() {
  return (
    <AdminPageWrapper>
      <TeachersPageContent />
    </AdminPageWrapper>
  );
}

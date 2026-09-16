'use client';

import { useState, useEffect } from 'react';
import { useAppSelector } from '@/lib/hooks';
import { AdminRoleShell } from '@/components/role-area/AdminRoleShell';
import AssignmentDataTable from '@/components/AssignmentDataTable';
import AssignmentModal from '@/components/AssignmentModal';
import PageSection from '@/components/PageSection';
import WelcomeSection from '@/components/WelcomeSection';
import ConfirmModal from '@/components/ui/confirm-modal';
import AdminPageWrapper from '@/components/AdminPageWrapper';
import { Assignment, AssignmentFilters as AssignmentFiltersType } from '@/types/assignment';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LuPlus as Plus, LuSearch as Search, LuX as X, LuFileText as LuFileText } from 'react-icons/lu';;
import { assignmentsStaffService } from '@/services/assignmentsStaffService';
import { useRouter } from 'next/navigation';

function AssignmentsPageContent() {
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth);
  
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [search, setSearch] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState<Assignment | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    page: 1,
    limit: 10
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: filters.page.toString(),
        limit: filters.limit.toString(),
        ...(filters.search && { search: filters.search }),
      });

      const response = await assignmentsStaffService.listAdminAssignments(queryParams.toString());
      const data = await response.json();

      if (response.ok) {
        const assignments = data.data?.assignments || data.assignments || [];
        const pagination = data.data?.pagination || data.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0
        };
        setAssignments(Array.isArray(assignments) ? assignments : []);
        setPagination(pagination);
      } else {
        console.error('Failed to fetch assignments:', data.error);
        setAssignments([]);
        setPagination({
          page: 1,
          limit: 10,
          total: 0,
          pages: 0
        });
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
      setAssignments([]);
      setPagination({
        page: 1,
        limit: 10,
        total: 0,
        pages: 0
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [filters]);

  const handleSearchChange = (searchValue: string) => {
    setSearch(searchValue);
    setFilters(prev => ({ ...prev, search: searchValue, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({
      ...prev,
      page
    }));
  };

  const handleAddAssignment = () => {
    setEditingAssignment(null);
    setShowForm(true);
  };

  const handleEditAssignment = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setShowForm(true);
  };

  const handleDeleteAssignment = (assignment: Assignment) => {
    setAssignmentToDelete(assignment);
    setDeleteError(null);
    setShowDeleteModal(true);
  };

  const handleViewSubmissions = (assignment: Assignment) => {
    router.push(`/admin/assignments/${assignment._id}/submissions`);
  };

  const confirmDeleteAssignment = async () => {
    if (!assignmentToDelete) return;

    setDeleting(true);
    try {
      const response = await assignmentsStaffService.deleteAdminAssignment(assignmentToDelete._id);

      const data = await response.json();

      if (response.ok) {
        console.log('Assignment deleted successfully');
        fetchAssignments();
        setShowDeleteModal(false);
        setAssignmentToDelete(null);
      } else {
        console.error('Failed to delete assignment:', data.error);
      }
    } catch (error) {
      console.error('Error deleting assignment:', error);
    } finally {
      setDeleting(false);
    }
  };

  const cancelDeleteAssignment = () => {
    setShowDeleteModal(false);
    setAssignmentToDelete(null);
    setDeleteError(null);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingAssignment(null);
    fetchAssignments();
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingAssignment(null);
  };

  const handleQuickSearch = () => {
    // Focus on the search input in the filters section
    const searchInput = document.querySelector('input[placeholder*="Search assignments"]') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
    }
  };

  return (
    <AdminRoleShell>
      <main className="relative z-10 p-2 sm:p-4">
        {/* Welcome Section */}
        <WelcomeSection 
          title="Assignment Management"
          description="Create, manage assignments and track student submissions"
        />

        {/* Assignments Table */}
        <PageSection 
          title="Assignments"
          description="Complete list of all assignments in the system"
          className="mb-2 sm:mb-4"
          actions={
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search assignments..."
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
              <Button 
                onClick={handleAddAssignment}
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
                <LuFileText className="w-4 h-4" />
                <span className="hidden sm:inline">Create Assignment</span>
                <span className="sm:hidden">Create</span>
              </Button>
            </div>
          }
        >

          <div className="w-full overflow-hidden">
            <AssignmentDataTable
              assignments={assignments}
              loading={loading}
              onEdit={handleEditAssignment}
              onDelete={handleDeleteAssignment}
              onViewSubmissions={handleViewSubmissions}
              pagination={pagination}
              onPageChange={handlePageChange}
              variant="table"
            />
          </div>
        </PageSection>

        {/* Floating Action Button for Mobile */}
        <div className="fixed bottom-6 right-6 z-40 sm:hidden">
          <Button
            onClick={handleAddAssignment}
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
            <LuFileText className="w-6 h-6" />
          </Button>
        </div>

        {/* Assignment Modal */}
        <AssignmentModal
          open={showForm}
          assignment={editingAssignment}
          role="admin"
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          open={showDeleteModal}
          onClose={cancelDeleteAssignment}
          onConfirm={confirmDeleteAssignment}
          title="Delete Assignment"
          description={`Are you sure you want to delete "${assignmentToDelete?.title}"? This action cannot be undone.`}
          confirmText="Delete Assignment"
          cancelText="Cancel"
          variant="danger"
          loading={deleting}
        >
          {deleteError && (
            <p className="mt-3 text-sm text-red-600 font-medium">{deleteError}</p>
          )}
        </ConfirmModal>

      </main>
    </AdminRoleShell>
  );
}

export default function AssignmentsPage() {
  return (
    <AdminPageWrapper>
      <AssignmentsPageContent />
    </AdminPageWrapper>
  );
}

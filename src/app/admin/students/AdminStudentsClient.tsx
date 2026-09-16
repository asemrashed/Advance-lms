'use client';

import { useState, useEffect } from 'react';
import { AdminRoleShell } from '@/components/role-area/AdminRoleShell';
import StudentDataTable from '@/components/StudentDataTable';
import StudentModal from '@/components/StudentModal';
import PageSection from '@/components/PageSection';
import WelcomeSection from '@/components/WelcomeSection';
import ConfirmModal from '@/components/ui/confirm-modal';
import AdminPageWrapper from '@/components/AdminPageWrapper';
import { Student, StudentFilters as StudentFiltersType } from '@/types/student';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { studentsStaffService } from '@/services/studentsStaffService';
import { LuPlus as Plus, LuSearch as Search, LuX as X } from 'react-icons/lu';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';

function StudentsPageContent() {
  const { can } = useAdminPermissions();
  const canMutate = can("manage_students");
  
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [search, setSearch] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState(false);
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

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: filters.page.toString(),
        limit: filters.limit.toString(),
        ...(filters.search && { search: filters.search }),
      });

      const response = await studentsStaffService.listStudents(queryParams.toString());
      const data = await response.json();

      if (response.ok) {
        setStudents(data.students || []);
        setPagination(data.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0
        });
      } else {
        console.error('Failed to fetch students:', data.error);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
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

  const handleAddStudent = () => {
    setEditingStudent(null);
    setShowForm(true);
  };

  const handleQuickSearch = () => {
    // Focus on the search input in the filters section
    const searchInput = document.querySelector('input[placeholder*="Search students"]') as HTMLInputElement;
    if (searchInput) {
      searchInput.focus();
    }
  };

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
    setShowForm(true);
  };

  const handleDeleteStudent = (student: Student) => {
    setStudentToDelete(student);
    setShowDeleteModal(true);
  };

  const confirmDeleteStudent = async () => {
    if (!studentToDelete) return;

    setDeleting(true);
    try {
      const response = await studentsStaffService.deleteStudent(studentToDelete._id);

      const data = await response.json();

      if (response.ok) {
        console.log('Student deleted successfully');
        fetchStudents();
        setShowDeleteModal(false);
        setStudentToDelete(null);
      } else {
        console.error('Failed to delete student:', data.error);
      }
    } catch (error) {
      console.error('Error deleting student:', error);
    } finally {
      setDeleting(false);
    }
  };

  const cancelDeleteStudent = () => {
    setShowDeleteModal(false);
    setStudentToDelete(null);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setEditingStudent(null);
    fetchStudents();
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingStudent(null);
  };


  return (
    <AdminRoleShell>
      <main className="relative z-10 p-2 sm:p-4">
        {/* Welcome Section */}
        <WelcomeSection 
          title="Student Management"
          description="Manage students and their information"
        />

        {/* Students Table */}
        <PageSection 
          title="Students"
          description="Complete list of all students in the system"
          className="mb-2 sm:mb-4"
          actions={
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search students..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-10 pr-10 w-full sm:w-64"
                  disabled={loading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                    }
                  }}
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
                onClick={handleAddStudent}
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
                <span className="hidden sm:inline">Add Student</span>
                <span className="sm:hidden">Add</span>
              </Button>
              ) : null}
            </div>
          }
        >
          <div className="w-full overflow-hidden">
            <StudentDataTable
              students={students}
              loading={loading}
              onEdit={canMutate ? handleEditStudent : undefined}
              onDelete={canMutate ? handleDeleteStudent : undefined}
              pagination={pagination}
              onPageChange={handlePageChange}
              variant="table"
            />
          </div>
        </PageSection>

        {/* Floating Action Button for Mobile */}
        {canMutate ? (
        <div className="fixed bottom-6 right-6 z-40 sm:hidden">
          <Button
            onClick={handleAddStudent}
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
        ) : null}

        {/* Student Modal */}
        <StudentModal
          open={showForm}
          student={editingStudent}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          open={showDeleteModal}
          onClose={cancelDeleteStudent}
          onConfirm={confirmDeleteStudent}
          title="Delete Student"
          description={`Are you sure you want to delete ${studentToDelete?.name || 'this student'}? This action cannot be undone.`}
          confirmText="Delete Student"
          cancelText="Cancel"
          variant="danger"
          loading={deleting}
        />
      </main>
    </AdminRoleShell>
  );
}

export default function StudentsPage() {
  return (
    <AdminPageWrapper>
      <StudentsPageContent />
    </AdminPageWrapper>
  );
}

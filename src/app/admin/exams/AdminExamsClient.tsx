'use client';

import { useState, useEffect } from 'react';
import { useAppSelector } from '@/lib/hooks';
import { AdminRoleShell } from '@/components/role-area/AdminRoleShell';
import ExamDataTable from '@/components/ExamDataTable';
import ExamModal from '@/components/ExamModal';
import PageSection from '@/components/PageSection';
import WelcomeSection from '@/components/WelcomeSection';
import ConfirmModal from '@/components/ui/confirm-modal';
import AdminPageWrapper from '@/components/AdminPageWrapper';
import { Exam, ExamFilters as ExamFiltersType } from '@/types/exam';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AttractiveInput } from '@/components/ui/attractive-input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { LuPlus as Plus, LuSearch as Search, LuX as X, LuBookOpen as BookOpen, LuFilter as Filter, LuTag as Tag, LuClock as Clock, LuCalendar as Calendar, LuArrowUpDown as ArrowUpDown, LuSettings as Settings, LuUser as User, LuTarget as Target } from 'react-icons/lu';;
import { examsStaffService } from '@/services/examsStaffService';
import { coursesStaffService } from '@/services/coursesStaffService';
import { useRouter } from 'next/navigation';

function ExamsPageContent() {
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth);
  
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [search, setSearch] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [examToDelete, setExamToDelete] = useState<Exam | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    page: 1,
    limit: 10,
    type: 'all' as 'mcq' | 'written' | 'mixed' | 'all',
    status: 'all' as 'draft' | 'published' | 'scheduled' | 'active' | 'expired' | 'inactive' | 'all',
    difficulty: 'all' as 'easy' | 'medium' | 'hard' | 'all',
    course: 'all',
    createdBy: 'all',
    isActive: 'all' as 'true' | 'false' | 'all',
    isPublished: 'all' as 'true' | 'false' | 'all',
    sortBy: 'createdAt' as 'title' | 'createdAt' | 'updatedAt' | 'totalMarks' | 'duration',
    sortOrder: 'desc' as 'asc' | 'desc'
  });
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [courses, setCourses] = useState<Array<{_id: string, title: string}>>([]);
  const [creators, setCreators] = useState<Array<{_id: string, name: string, email: string, role: string}>>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const fetchExams = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: filters.page.toString(),
        limit: filters.limit.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.type !== 'all' && { type: filters.type }),
        ...(filters.status !== 'all' && { status: filters.status }),
        ...(filters.difficulty !== 'all' && { difficulty: filters.difficulty }),
        ...(filters.course !== 'all' && { course: filters.course }),
        ...(filters.createdBy !== 'all' && { createdBy: filters.createdBy }),
        ...(filters.isActive !== 'all' && { isActive: filters.isActive }),
        ...(filters.isPublished !== 'all' && { isPublished: filters.isPublished }),
        ...(filters.sortBy && { sortBy: filters.sortBy }),
        ...(filters.sortOrder && { sortOrder: filters.sortOrder }),
      });

      const response = await examsStaffService.listAdminExams(queryParams.toString());
      const data = await response.json();
      
      console.log('Exams API Response:', {
        status: response.status,
        ok: response.ok,
        data: data,
        url: `/api/exams?${queryParams}`
      });

      if (response.ok) {
        // Handle different possible response structures
        const exams = data.data?.exams || data.exams || [];
        const pagination = data.data?.pagination || data.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0
        };
        setExams(Array.isArray(exams) ? exams : []);
        setPagination(pagination);
      } else {
        console.error('Failed to fetch exams:', data.error);
        setExams([]);
        setPagination({
          page: 1,
          limit: 10,
          total: 0,
          pages: 0
        });
      }
    } catch (error) {
      console.error('Error fetching exams:', error);
      setExams([]);
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

  const fetchCourses = async () => {
    try {
      const response = await coursesStaffService.listCourses("limit=500");
      const data = await response.json();
      if (response.ok) {
        // Handle different possible response structures
        const courses = data.data?.courses || data.courses || data.data || [];
        setCourses(Array.isArray(courses) ? courses : []);
      } else {
        console.error('Failed to fetch courses:', data.error);
        setCourses([]);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      setCourses([]);
    }
  };

  const fetchCreators = async () => {
    try {
      const response = await coursesStaffService.listInstructorUsers();
      const data = await response.json();
      if (response.ok) {
        // Handle different possible response structures
        const users = data.data?.users || data.users || data.data || [];
        setCreators(Array.isArray(users) ? users : []);
      } else {
        console.error('Failed to fetch creators:', data.error);
        setCreators([]);
      }
    } catch (error) {
      console.error('Error fetching creators:', error);
      setCreators([]);
    }
  };

  useEffect(() => {
    fetchExams();
  }, [filters]);

  useEffect(() => {
    fetchCourses();
    fetchCreators();
  }, []);

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

  const handleAddExam = () => {
    setEditingExam(null);
    setShowForm(true);
  };

  const handleEditExam = (exam: Exam) => {
    setEditingExam(exam);
    setShowForm(true);
  };

  const handleDeleteExam = (exam: Exam) => {
    setExamToDelete(exam);
    setShowDeleteModal(true);
  };

  const handleManageQuestions = (exam: Exam) => {
    router.push(`/admin/exams/${exam._id}/questions`);
  };

  const handleViewAttempts = (exam: Exam) => {
    router.push(`/admin/exams/${exam._id}/attempts`);
  };

  const confirmDeleteExam = async () => {
    if (!examToDelete) return;

    setDeleting(true);
    try {
      const response = await examsStaffService.deleteAdminExam(examToDelete._id);

      const data = await response.json();

      if (response.ok) {
        console.log('Exam deleted successfully');
        fetchExams();
        setShowDeleteModal(false);
        setExamToDelete(null);
      } else {
        console.error('Failed to delete exam:', data.error);
      }
    } catch (error) {
      console.error('Error deleting exam:', error);
    } finally {
      setDeleting(false);
    }
  };

  const cancelDeleteExam = () => {
    setShowDeleteModal(false);
    setExamToDelete(null);
  };

  const handleFormSuccess = (saved: Exam) => {
    const wasCreate = !editingExam;
    setShowForm(false);
    setEditingExam(null);
    if (wasCreate && saved?._id) {
      router.push(`/admin/exams/${saved._id}/questions?setup=1`);
      return;
    }
    fetchExams();
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingExam(null);
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1
    }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      page: 1,
      limit: 10,
      type: 'all',
      status: 'all',
      difficulty: 'all',
      course: 'all',
      createdBy: 'all',
      isActive: 'all',
      isPublished: 'all',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
    setSearch('');
    setShowFilterDrawer(false);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.type !== 'all') count++;
    if (filters.status !== 'all') count++;
    if (filters.difficulty !== 'all') count++;
    if (filters.course !== 'all') count++;
    if (filters.createdBy !== 'all') count++;
    if (filters.isActive !== 'all') count++;
    if (filters.isPublished !== 'all') count++;
    if (filters.sortBy !== 'createdAt') count++;
    if (filters.sortOrder !== 'desc') count++;
    return count;
  };

  return (
    <AdminRoleShell>
      <main className="relative z-10 p-2 sm:p-4">
        {/* Welcome Section */}
        <WelcomeSection 
          title="Exam Management"
          description="Create, manage exams and questions for your students"
        />

        {/* Exams Table */}
        <PageSection 
          title="Exams"
          description={
            getActiveFiltersCount() > 0 
              ? `Showing ${exams.length} exams with ${getActiveFiltersCount()} active filter${getActiveFiltersCount() > 1 ? 's' : ''}`
              : `All exams in the system (${exams.length} total)`
          }
          className="mb-2 sm:mb-4"
          actions={
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <Button 
                onClick={() => setShowFilterDrawer(true)}
                variant="outline"
                className="flex items-center gap-2 border-2 transition-all duration-200 font-semibold"
                style={{
                  borderColor: '#7B2CBF',
                  backgroundColor: 'transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#A855F7';
                  e.currentTarget.style.backgroundColor = 'rgba(123, 44, 191, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#7B2CBF';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Settings className="w-4 h-4" style={{ color: '#7B2CBF' }} />
                <span>Advanced Filters</span>
                {getActiveFiltersCount() > 0 && (
                  <span className="text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center font-bold animate-pulse" style={{
                    background: "linear-gradient(135deg, #EC4899 0%, #A855F7 100%)",
                  }}>
                    {getActiveFiltersCount()}
                  </span>
                )}
              </Button>
              {getActiveFiltersCount() > 0 && (
                <Button 
                  onClick={clearFilters}
                  variant="outline"
                  className="flex items-center gap-2 border-2 border-red-300 hover:border-red-400 hover:bg-red-50 transition-all duration-200 font-semibold"
                >
                  <X className="w-4 h-4 text-red-600" />
                  <span>Clear Filters</span>
                </Button>
              )}
              <Button 
                onClick={handleAddExam}
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
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">Create Exam</span>
                <span className="sm:hidden">Create</span>
              </Button>
            </div>
          }
        >
          <div className="w-full overflow-hidden">
            <ExamDataTable
              exams={exams}
              loading={loading}
              onEdit={handleEditExam}
              onDelete={handleDeleteExam}
              onManageQuestions={handleManageQuestions}
              onViewAttempts={handleViewAttempts}
              pagination={pagination}
              onPageChange={handlePageChange}
              variant="table"
            />
          </div>
        </PageSection>

        {/* Floating Action Button for Mobile */}
        <div className="fixed bottom-6 right-6 z-40 sm:hidden">
          <Button
            onClick={handleAddExam}
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
            <BookOpen className="w-6 h-6" />
          </Button>
        </div>

        {/* Exam Modal */}
        <ExamModal
          open={showForm}
          exam={editingExam}
          onClose={handleFormClose}
          onSuccess={handleFormSuccess}
        />

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          open={showDeleteModal}
          onClose={cancelDeleteExam}
          onConfirm={confirmDeleteExam}
          title="Delete Exam"
          description={`Are you sure you want to delete "${examToDelete?.title}"? This action cannot be undone.`}
          confirmText="Delete Exam"
          cancelText="Cancel"
          variant="danger"
          loading={deleting}
        />

        {/* Advanced Filters Drawer */}
        <Sheet open={showFilterDrawer} onOpenChange={setShowFilterDrawer}>
          <SheetContent side="right" className="w-full sm:max-w-md border-l-2" style={{
            backgroundColor: '#FAFAFA',
            borderColor: 'rgba(123, 44, 191, 0.2)',
          }}>
            <SheetHeader className="bg-white rounded-lg p-4 sm:p-6 shadow-sm" style={{
              border: '1px solid rgba(123, 44, 191, 0.1)',
            }}>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex-1">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1 flex items-center gap-2">
                    <Settings className="w-5 h-5" style={{ color: '#7B2CBF' }} />
                    Advanced Filters
                  </h3>
                  <p className="text-sm text-gray-600">
                    Filter and sort exams to find exactly what you're looking for
                  </p>
                </div>
              </div>
            </SheetHeader>
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* Search Input */}
              <div>
                <AttractiveInput
                  type="text"
                  label="Search Exams"
                  placeholder="Search by title, description..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  icon="search"
                  variant="default"
                  colorScheme="primary"
                  size="md"
                  helperText="Find exams by typing keywords"
                />
              </div>
              
              {/* Type Filter */}
              <div className="bg-white rounded-lg p-3 shadow-md hover:shadow-lg transition-all duration-200" style={{
                border: '1px solid rgba(123, 44, 191, 0.2)',
              }}>
                <label className="flex text-sm font-semibold text-foreground mb-2 items-center gap-2">
                  <BookOpen className="w-4 h-4" style={{ color: '#7B2CBF' }} />
                  Exam Type
                </label>
                <select
                  value={filters.type}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                  className="w-full h-10 px-3 py-2 border-2 rounded-lg bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all duration-200 font-medium text-sm"
                  style={{
                    borderColor: '#7B2CBF',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#A855F7'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = '#7B2CBF'}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#A855F7';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(123, 44, 191, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#7B2CBF';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <option value="all">All Types</option>
                  <option value="mcq">Multiple Choice</option>
                  <option value="written">Written/Essay</option>
                  <option value="mixed">Mixed Format</option>
                </select>
              </div>

              {/* Status Filter */}
              <div className="bg-white rounded-lg p-3 shadow-md hover:shadow-lg transition-all duration-200" style={{
                border: '1px solid rgba(16, 185, 129, 0.2)',
              }}>
                <label className="flex text-sm font-semibold text-foreground mb-2 items-center gap-2">
                  <Tag className="w-4 h-4" style={{ color: '#10B981' }} />
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full h-10 px-3 py-2 border-2 rounded-lg bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all duration-200 font-medium text-sm"
                  style={{
                    borderColor: '#10B981',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#14B8A6'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = '#10B981'}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#14B8A6';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#10B981';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <option value="all">All Status</option>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="active">Active</option>
                  <option value="expired">Expired</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              {/* Course Filter */}
              <div className="bg-white rounded-lg p-3 shadow-md hover:shadow-lg transition-all duration-200" style={{
                border: '1px solid rgba(168, 85, 247, 0.2)',
              }}>
                <label className="flex text-sm font-semibold text-foreground mb-2 items-center gap-2">
                  <BookOpen className="w-4 h-4" style={{ color: '#A855F7' }} />
                  Course
                </label>
                <select
                  value={filters.course}
                  onChange={(e) => handleFilterChange('course', e.target.value)}
                  className="w-full h-10 px-3 py-2 border-2 rounded-lg bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all duration-200 font-medium text-sm"
                  style={{
                    borderColor: '#A855F7',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#9333EA'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = '#A855F7'}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#9333EA';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(168, 85, 247, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#A855F7';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <option value="all">All Courses</option>
                  {courses.map((course) => (
                    <option key={course._id} value={course._id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Creator Filter */}
              <div className="bg-white rounded-lg p-3 shadow-md hover:shadow-lg transition-all duration-200" style={{
                border: '1px solid rgba(123, 44, 191, 0.2)',
              }}>
                <label className="flex text-sm font-semibold text-foreground mb-2 items-center gap-2">
                  <User className="w-4 h-4" style={{ color: '#7B2CBF' }} />
                  Creator
                </label>
                <select
                  value={filters.createdBy}
                  onChange={(e) => handleFilterChange('createdBy', e.target.value)}
                  className="w-full h-10 px-3 py-2 border-2 rounded-lg bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all duration-200 font-medium text-sm"
                  style={{
                    borderColor: '#7B2CBF',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.borderColor = '#A855F7'}
                  onMouseLeave={(e) => e.currentTarget.style.borderColor = '#7B2CBF'}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#A855F7';
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(123, 44, 191, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#7B2CBF';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <option value="all">All Creators</option>
                  {creators.map((creator) => (
                    <option key={creator._id} value={creator._id}>
                      {creator.name} ({creator.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort Options */}
              <div className="bg-white rounded-lg p-3 shadow-md hover:shadow-lg transition-all duration-200" style={{
                border: '1px solid rgba(255, 107, 53, 0.2)',
              }}>
                <label className="flex text-sm font-semibold text-foreground mb-2 items-center gap-2">
                  <ArrowUpDown className="w-4 h-4" style={{ color: '#FF6B35' }} />
                  Sort By
                </label>
                <div className="space-y-3">
                  <select
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                    className="w-full h-10 px-3 py-2 border-2 rounded-lg bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all duration-200 font-medium text-sm"
                    style={{
                      borderColor: '#FF6B35',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#FF8C5A'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = '#FF6B35'}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#FF8C5A';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255, 107, 53, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#FF6B35';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <option value="createdAt">Date Created</option>
                    <option value="updatedAt">Last Updated</option>
                    <option value="title">Title</option>
                    <option value="totalMarks">Total Marks</option>
                    <option value="duration">Duration</option>
                  </select>
                  <select
                    value={filters.sortOrder}
                    onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                    className="w-full h-10 px-3 py-2 border-2 rounded-lg bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all duration-200 font-medium text-sm"
                    style={{
                      borderColor: '#FF6B35',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = '#FF8C5A'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = '#FF6B35'}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#FF8C5A';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(255, 107, 53, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = '#FF6B35';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                  </select>
                </div>
              </div>
            </div>

            <SheetFooter className="flex flex-col gap-2 bg-white rounded-lg p-4 sm:p-6 shadow-sm" style={{
              border: '1px solid rgba(123, 44, 191, 0.1)',
            }}>
              <div className="flex gap-2 w-full">
                <Button 
                  onClick={clearFilters}
                  variant="outline"
                  className="flex-1 border-2 transition-all duration-200 font-semibold"
                  style={{
                    borderColor: '#EF4444',
                    backgroundColor: 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#DC2626';
                    e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#EF4444';
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <X className="w-4 h-4 mr-2" style={{ color: '#EF4444' }} />
                  Clear All
                </Button>
                <Button 
                  onClick={() => setShowFilterDrawer(false)}
                  className="flex-1 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
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
                  Apply Filters
                </Button>
              </div>
              <p className="text-xs text-center font-medium" style={{ color: '#7B2CBF' }}>
                {getActiveFiltersCount() > 0 
                  ? `${getActiveFiltersCount()} filter${getActiveFiltersCount() > 1 ? 's' : ''} active`
                  : 'No filters applied'
                }
              </p>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </main>
    </AdminRoleShell>
  );
}

export default function ExamsPage() {
  return (
    <AdminPageWrapper>
      <ExamsPageContent />
    </AdminPageWrapper>
  );
}

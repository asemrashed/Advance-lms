'use client';

import { useState, useEffect } from 'react';
import { useAppSelector } from '@/lib/hooks';
import { AdminRoleShell } from '@/components/role-area/AdminRoleShell';
import PageSection from '@/components/PageSection';
import WelcomeSection from '@/components/WelcomeSection';
import AdminPageWrapper from '@/components/AdminPageWrapper';
import { Question, QuestionFilters as QuestionFiltersType } from '@/types/exam';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AttractiveInput } from '@/components/ui/attractive-input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import ConfirmModal from '@/components/ui/confirm-modal';
import { LuPlus as Plus, LuSearch as Search, LuX as X, LuBookOpen as BookOpen, LuFilter as Filter, LuTag as Tag, LuClock as Clock, LuCalendar as Calendar, LuArrowUpDown as ArrowUpDown, LuSettings as Settings, LuTarget as Target, LuPencil as Edit, LuTrash2 as Trash2, LuEye as Eye, LuUpload as Upload } from 'react-icons/lu';;
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import DataTable, { Column, Action } from '@/components/ui/data-table';
import QuestionModal from '@/components/QuestionModal';
import CSVUploadModal from '@/components/CSVUploadModal';
import QuestionViewModal from '@/components/QuestionViewModal';
import { examsStaffService } from '@/services/examsStaffService';
import { questionsStaffService } from '@/services/questionsStaffService';
import { format } from 'date-fns';

interface QuestionsPageProps {
  params: Promise<{
    id: string;
  }>;
}

function QuestionsPageContent({ params }: QuestionsPageProps) {
  const router = useRouter();
  const { user } = useAppSelector((state) => state.auth);
  const [examId, setExamId] = useState<string>('');
  
  // Await params to get the exam ID
  useEffect(() => {
    const getParams = async () => {
      const resolvedParams = await params;
      setExamId(resolvedParams.id);
    };
    getParams();
  }, [params]);
  
  const [exam, setExam] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    page: 1,
    limit: 10,
    type: 'all' as 'mcq' | 'written' | 'true_false' | 'fill_blank' | 'essay' | 'all',
    difficulty: 'all' as 'easy' | 'medium' | 'hard' | 'all',
    category: 'all',
    isActive: 'all' as 'true' | 'false' | 'all',
    sortBy: 'createdAt' as 'question' | 'createdAt' | 'updatedAt' | 'marks' | 'difficulty',
    sortOrder: 'desc' as 'asc' | 'desc'
  });
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<Question | null>(null);
  const [deletingQuestion, setDeletingQuestion] = useState(false);
  const [showCSVUpload, setShowCSVUpload] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingQuestion, setViewingQuestion] = useState<Question | null>(null);
  const [passingMarks, setPassingMarks] = useState(0);
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusError, setStatusError] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const fetchExam = async () => {
    if (!examId) return;
    
    try {
      const response = await examsStaffService.getAdminExam(examId);
      const data = await response.json();
      if (response.ok) {
        const nextExam = data.data?.exam || data.exam || null;
        setExam(nextExam);
        if (nextExam) setPassingMarks(Number(nextExam.passingMarks || 0));
      } else {
        console.error('Failed to fetch exam:', data.error);
        setExam(null);
      }
    } catch (error) {
      console.error('Error fetching exam:', error);
      setExam(null);
    }
  };

  const fetchQuestions = async () => {
    if (!examId) return;
    
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: filters.page.toString(),
        limit: filters.limit.toString(),
        exam: examId,
        ...(filters.search && { search: filters.search }),
        ...(filters.type !== 'all' && { type: filters.type }),
        ...(filters.difficulty !== 'all' && { difficulty: filters.difficulty }),
        ...(filters.category !== 'all' && { category: filters.category }),
        ...(filters.isActive !== 'all' && { isActive: filters.isActive }),
        ...(filters.sortBy && { sortBy: filters.sortBy }),
        ...(filters.sortOrder && { sortOrder: filters.sortOrder }),
      });

      const response = await questionsStaffService.listAdminQuestions(queryParams.toString());
      const data = await response.json();

      if (response.ok) {
        const questions = data.data?.questions || data.questions || [];
        const pagination = data.data?.pagination || data.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0
        };
        setQuestions(Array.isArray(questions) ? questions : []);
        setPagination(pagination);
      } else {
        console.error('Failed to fetch questions:', data.error);
        setQuestions([]);
        setPagination({
          page: 1,
          limit: 10,
          total: 0,
          pages: 0
        });
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
      setQuestions([]);
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
    if (examId) {
      fetchExam();
    }
  }, [examId]);

  useEffect(() => {
    if (examId) {
      fetchQuestions();
    }
  }, [filters, examId]);

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

  const handleCreateQuestion = () => {
    setEditingQuestion(null);
    setShowQuestionModal(true);
  };

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question);
    setShowQuestionModal(true);
  };

  const handleQuestionSuccess = (question: Question) => {
    if (editingQuestion) {
      // Update existing question in the list
      setQuestions(prev => prev.map(q => q._id === question._id ? question : q));
    } else {
      // Add new question to the list
      setQuestions(prev => [question, ...prev]);
    }
    setShowQuestionModal(false);
    setEditingQuestion(null);
  };

  const handleCloseModal = () => {
    setShowQuestionModal(false);
    setEditingQuestion(null);
  };

  const handleDeleteQuestion = (question: Question) => {
    setQuestionToDelete(question);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteQuestion = async () => {
    if (!questionToDelete) return;

    setDeletingQuestion(true);
    try {
      const response = await questionsStaffService.deleteAdminQuestion(questionToDelete._id);

      if (response.ok) {
        // Remove question from the list
        setQuestions(prev => prev.filter(q => q._id !== questionToDelete._id));
        // Update pagination
        setPagination(prev => ({
          ...prev,
          total: prev.total - 1
        }));
      } else {
        const data = await response.json();
        console.error('Failed to delete question:', data.error || 'Unknown error');
      }
    } catch (error) {
      console.error('Error deleting question:', error);
    } finally {
      setDeletingQuestion(false);
      setShowDeleteConfirm(false);
      setQuestionToDelete(null);
    }
  };

  const cancelDeleteQuestion = () => {
    if (deletingQuestion) return; // Prevent closing while deleting
    setShowDeleteConfirm(false);
    setQuestionToDelete(null);
  };

  const handleViewQuestion = (question: Question) => {
    setViewingQuestion(question);
    setShowViewModal(true);
  };

  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setViewingQuestion(null);
  };

  const handleCSVUpload = () => {
    setShowCSVUpload(true);
  };

  const totalMarksSum = questions.reduce((sum, q) => sum + Number(q.marks || 0), 0);

  const finalizeExam = async (publish: boolean) => {
    if (!examId) return;
    setStatusError('');
    if (publish && questions.length === 0) {
      setStatusError('Add at least one question before publishing');
      return;
    }
    if (passingMarks > totalMarksSum) {
      setStatusError('Passing marks cannot exceed total marks');
      return;
    }
    setSavingStatus(true);
    try {
      const response = await examsStaffService.updateExam(examId, {
          isPublished: publish,
          isActive: true,
          passingMarks,
          totalMarks: totalMarksSum || 1,
          reconcileMarks: true,
        });
      const data = await response.json();
      if (!response.ok) {
        setStatusError(data.error || 'Failed to update exam');
        return;
      }
      router.push('/admin/exams');
    } catch {
      setStatusError('Unexpected error. Please try again.');
    } finally {
      setSavingStatus(false);
    }
  };

  const handleCSVSuccess = (questions: Question[]) => {
    // Add new questions to the list
    setQuestions(prev => [...questions, ...prev]);
    // Update pagination
    setPagination(prev => ({
      ...prev,
      total: prev.total + questions.length
    }));
    setShowCSVUpload(false);
  };

  const handleCloseCSVUpload = () => {
    setShowCSVUpload(false);
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
      difficulty: 'all',
      category: 'all',
      isActive: 'all',
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
    if (filters.difficulty !== 'all') count++;
    if (filters.category !== 'all') count++;
    if (filters.isActive !== 'all') count++;
    if (filters.sortBy !== 'createdAt') count++;
    if (filters.sortOrder !== 'desc') count++;
    return count;
  };

  const getDifficultyBadge = (difficulty: string) => {
    const colors = {
      easy: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      hard: 'bg-red-100 text-red-800'
    };

    return (
      <Badge variant="outline" className={colors[difficulty as keyof typeof colors]}>
        {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
      </Badge>
    );
  };

  const getTypeBadge = (type: string) => {
    const colors = {
      mcq: 'bg-blue-100 text-blue-800',
      written: 'bg-purple-100 text-purple-800',
      true_false: 'bg-green-100 text-green-800',
      fill_blank: 'bg-orange-100 text-orange-800',
      essay: 'bg-pink-100 text-pink-800'
    };

    return (
      <Badge variant="outline" className={colors[type as keyof typeof colors]}>
        {type.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  const formatDate = (date: Date | string) => {
    return format(new Date(date), 'MMM dd, yyyy');
  };

  const columns: Column<Question>[] = [
    {
      key: 'question',
      label: 'Question',
      width: 'w-2/5',
      render: (question) => (
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-900 line-clamp-2">
            {question.question}
          </p>
          <div className="flex items-center gap-2">
            {getTypeBadge(question.type)}
            {getDifficultyBadge(question.difficulty)}
          </div>
          {question.category && (
            <Badge variant="outline" className="text-xs">
              {question.category}
            </Badge>
          )}
        </div>
      )
    },
    {
      key: 'marks',
      label: 'Marks',
      width: 'w-1/6',
      render: (question) => (
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900">{question.marks}</div>
          <div className="text-xs text-gray-500">points</div>
        </div>
      )
    },
    {
      key: 'options',
      label: 'Options',
      width: 'w-1/6',
      render: (question) => (
        <div className="text-center">
          {question.type === 'mcq' && (
            <div className="text-sm text-gray-600">
              {question.options?.length || 0} options
            </div>
          )}
          {question.type === 'true_false' && (
            <div className="text-sm text-gray-600">
              {question.options?.length || 0} options
            </div>
          )}
          {(question.type === 'written' || question.type === 'essay') && (
            <div className="text-sm text-gray-600">Written</div>
          )}
          {question.type === 'fill_blank' && (
            <div className="text-sm text-gray-600">Fill Blank</div>
          )}
        </div>
      )
    },
    {
      key: 'timeLimit',
      label: 'Time Limit',
      width: 'w-1/6',
      render: (question) => (
        <div className="text-center">
          {question.timeLimit ? (
            <div className="text-sm text-gray-600">
              {question.timeLimit}m
            </div>
          ) : (
            <div className="text-sm text-gray-400">No limit</div>
          )}
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      width: 'w-1/6',
      render: (question) => (
        <div className="text-center">
          <Badge 
            variant={question.isActive ? 'default' : 'secondary'}
            className={question.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}
          >
            {question.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      )
    },
    {
      key: 'created',
      label: 'Created',
      width: 'w-1/6',
      render: (question) => (
        <div className="text-sm text-gray-900">
          {formatDate(question.createdAt)}
        </div>
      )
    }
  ];

  const actions: Action<Question>[] = [
    {
      key: 'view',
      label: 'View Details',
      icon: <Eye className="w-4 h-4" />,
      onClick: handleViewQuestion,
      variant: 'secondary' as const
    },
    {
      key: 'edit',
      label: 'Edit Question',
      icon: <Edit className="w-4 h-4" />,
      onClick: handleEditQuestion,
      variant: 'secondary' as const
    },
    {
      key: 'delete',
      label: 'Delete Question',
      icon: <Trash2 className="w-4 h-4" />,
      onClick: handleDeleteQuestion,
      variant: 'destructive' as const
    }
  ];

  const emptyState = {
    title: 'No questions found',
    description: 'Get started by adding questions to this exam.',
    icon: (
      <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  };

  return (
    <AdminRoleShell>
      <main className="relative z-10 p-2 sm:p-4">
        {/* Welcome Section */}
        <WelcomeSection 
          title={exam ? `Questions for "${exam.title}"` : 'Exam Questions'}
          description="Manage questions for this exam"
        />

        {/* Exam LuInfo */}
        {exam && (
          <PageSection 
            title="Exam LuInformation"
            className="mb-4"
          >
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{exam.title}</div>
                    <div className="text-sm text-gray-600">
                      {exam.type?.toUpperCase() ?? 'N/A'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center text-white">
                    <Target className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{exam.totalMarks} marks</div>
                    <div className="text-sm text-gray-600">Pass: {exam.passingMarks}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center text-white">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{exam.duration}m</div>
                    <div className="text-sm text-gray-600">Duration</div>
                  </div>
                </div>
              </div>
            </div>
          </PageSection>
        )}

        {/* Questions Table */}
        <PageSection 
          title="Questions"
          description={
            getActiveFiltersCount() > 0 
              ? `Showing ${questions.length} questions with ${getActiveFiltersCount()} active filter${getActiveFiltersCount() > 1 ? 's' : ''}`
              : `All questions for this exam (${questions.length} total)`
          }
          className="mb-2 sm:mb-4"
          actions={
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <Button 
                onClick={() => setShowFilterDrawer(true)}
                variant="outline"
                className="flex items-center gap-2 border-2 border-blue-300 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 font-semibold"
              >
                <Settings className="w-4 h-4 text-blue-600" />
                <span>Advanced Filters</span>
                {getActiveFiltersCount() > 0 && (
                  <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center font-bold animate-pulse">
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
              <div className="flex gap-2 w-full sm:w-auto">
                <Button 
                  onClick={handleCreateQuestion}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white flex-1 sm:flex-none"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add Question</span>
                  <span className="sm:hidden">Add</span>
                </Button>
                
                <Button 
                  onClick={handleCSVUpload}
                  variant="outline"
                  className="flex items-center gap-2 flex-1 sm:flex-none"
                >
                  <Upload className="w-4 h-4" />
                  <span className="hidden sm:inline">Upload CSV</span>
                  <span className="sm:hidden">CSV</span>
                </Button>
              </div>
            </div>
          }
        >
          <div className="w-full overflow-hidden">
            <DataTable
              data={questions}
              columns={columns}
              actions={actions}
              loading={loading}
              emptyState={emptyState}
              pagination={{
                ...pagination,
                onPageChange: handlePageChange
              }}
              variant="table"
              getItemId={(question) => question._id}
            />
          </div>
        </PageSection>

        <PageSection title="Finish" className="mb-4">
          <div className="grid gap-4 sm:grid-cols-3 mb-4">
            <div className="rounded-lg bg-muted/40 px-3 py-2">
              <p className="text-xs font-medium uppercase text-muted-foreground">Questions</p>
              <p className="text-2xl font-bold">{questions.length}</p>
            </div>
            <div className="rounded-lg bg-muted/40 px-3 py-2">
              <p className="text-xs font-medium uppercase text-muted-foreground">Total marks</p>
              <p className="text-2xl font-bold">{totalMarksSum}</p>
            </div>
            <AttractiveInput
              id="passingMarks"
              label="Passing marks"
              type="number"
              min={0}
              max={Math.max(totalMarksSum, 0)}
              value={passingMarks}
              onChange={(e) => setPassingMarks(parseInt(e.target.value, 10) || 0)}
            />
          </div>
          {statusError ? (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {statusError}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={savingStatus} onClick={() => void finalizeExam(false)}>
              Save draft
            </Button>
            <Button
              disabled={savingStatus || questions.length === 0}
              onClick={() => void finalizeExam(true)}
            >
              {savingStatus ? 'Saving…' : 'Publish exam'}
            </Button>
          </div>
        </PageSection>

        {/* Advanced Filters Drawer */}
        <Sheet open={showFilterDrawer} onOpenChange={setShowFilterDrawer}>
          <SheetContent side="right" className="w-full sm:max-w-md bg-gradient-to-br from-blue-50 via-white to-purple-50 border-l-2 border-blue-200">
            <SheetHeader className="bg-white/80 backdrop-blur-sm rounded-lg p-4 sm:p-6 border border-blue-100 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex-1">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-blue-600" />
                    Advanced Filters
                  </h3>
                  <p className="text-sm text-gray-600">
                    Filter and sort questions to find exactly what you're looking for
                  </p>
                </div>
              </div>
            </SheetHeader>
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* Search Input */}
              <div>
                <AttractiveInput
                  type="text"
                  label="Search Questions"
                  placeholder="Search by question text..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  icon="search"
                  variant="default"
                  colorScheme="primary"
                  size="md"
                  helperText="Find questions by typing keywords"
                />
              </div>
              
              {/* Type Filter */}
              <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 border border-blue-200 shadow-md hover:shadow-lg transition-all duration-200">
                <label className="block text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  Question Type
                </label>
                <select
                  value={filters.type}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                  className="w-full h-10 px-3 py-2 border-2 border-blue-300 hover:border-blue-400 focus:border-blue-500 focus:ring-blue-500/20 focus:shadow-lg focus:shadow-blue-500/10 rounded-lg bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all duration-200 font-medium text-sm"
                >
                  <option value="all">All Types</option>
                  <option value="mcq">Multiple Choice</option>
                  <option value="written">Written</option>
                  <option value="true_false">True/False</option>
                  <option value="fill_blank">Fill in the Blank</option>
                  <option value="essay">Essay</option>
                </select>
              </div>

              {/* Difficulty Filter */}
              <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 border border-green-200 shadow-md hover:shadow-lg transition-all duration-200">
                <label className="block text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4 text-green-600" />
                  Difficulty
                </label>
                <select
                  value={filters.difficulty}
                  onChange={(e) => handleFilterChange('difficulty', e.target.value)}
                  className="w-full h-10 px-3 py-2 border-2 border-green-300 hover:border-green-400 focus:border-green-500 focus:ring-green-500/20 focus:shadow-lg focus:shadow-green-500/10 rounded-lg bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all duration-200 font-medium text-sm"
                >
                  <option value="all">All Difficulties</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              {/* Sort Options */}
              <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 border border-orange-200 shadow-md hover:shadow-lg transition-all duration-200">
                <label className="block text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <ArrowUpDown className="w-4 h-4 text-orange-600" />
                  Sort By
                </label>
                <div className="space-y-3">
                  <select
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                    className="w-full h-10 px-3 py-2 border-2 border-orange-300 hover:border-orange-400 focus:border-orange-500 focus:ring-orange-500/20 focus:shadow-lg focus:shadow-orange-500/10 rounded-lg bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all duration-200 font-medium text-sm"
                  >
                    <option value="createdAt">Date Created</option>
                    <option value="updatedAt">Last Updated</option>
                    <option value="question">Question Text</option>
                    <option value="marks">Marks</option>
                    <option value="difficulty">Difficulty</option>
                  </select>
                  <select
                    value={filters.sortOrder}
                    onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                    className="w-full h-10 px-3 py-2 border-2 border-orange-300 hover:border-orange-400 focus:border-orange-500 focus:ring-orange-500/20 focus:shadow-lg focus:shadow-orange-500/10 rounded-lg bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all duration-200 font-medium text-sm"
                  >
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                  </select>
                </div>
              </div>
            </div>

            <SheetFooter className="flex flex-col gap-2 bg-white/80 backdrop-blur-sm rounded-lg p-4 sm:p-6 border border-blue-100 shadow-sm">
              <div className="flex gap-2 w-full">
                <Button 
                  onClick={clearFilters}
                  variant="outline"
                  className="flex-1 border-2 border-red-300 hover:border-red-400 hover:bg-red-50 transition-all duration-200 font-semibold"
                >
                  <X className="w-4 h-4 text-red-600 mr-2" />
                  Clear All
                </Button>
                <Button 
                  onClick={() => setShowFilterDrawer(false)}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  Apply Filters
                </Button>
              </div>
              <p className="text-xs text-blue-600 text-center font-medium">
                {getActiveFiltersCount() > 0 
                  ? `${getActiveFiltersCount()} filter${getActiveFiltersCount() > 1 ? 's' : ''} active`
                  : 'No filters applied'
                }
              </p>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {/* Question Modal */}
        <QuestionModal
          open={showQuestionModal}
          question={editingQuestion}
          examId={examId}
          examType={exam?.type}
          role="admin"
          lockScopeFromExam
          defaultSubject={
            exam?.subject ||
            (typeof exam?.course === 'object' ? exam.course?.subjectName : undefined)
          }
          defaultSubjectCode={
            exam?.subjectCode ||
            (typeof exam?.course === 'object' ? exam.course?.subjectCode : undefined)
          }
          defaultGrade={
            exam?.grade ||
            (typeof exam?.course === 'object' ? exam.course?.grade : undefined)
          }
          defaultComponentId={exam?.componentId}
          defaultComponentName={exam?.componentName}
          onClose={handleCloseModal}
          onSuccess={handleQuestionSuccess}
        />

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          open={showDeleteConfirm}
          onClose={cancelDeleteQuestion}
          onConfirm={confirmDeleteQuestion}
          title="Delete Question"
          description="Are you sure you want to delete this question? This will remove the question from this exam and delete it permanently. This action cannot be undone."
          confirmText={deletingQuestion ? "Deleting..." : "Delete Question"}
          cancelText="Cancel"
          variant="danger"
          loading={deletingQuestion}
        >
          {questionToDelete && (
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <p className="font-medium text-sm text-gray-700 mb-2">Question Preview:</p>
              <p className="text-sm text-gray-600">
                {questionToDelete.question.length > 100 
                  ? `${questionToDelete.question.substring(0, 100)}...` 
                  : questionToDelete.question}
              </p>
              <div className="mt-2 flex gap-2">
                <Badge variant="outline" className="text-xs">
                  {questionToDelete.type.toUpperCase()}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {questionToDelete.marks} marks
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {questionToDelete.difficulty}
                </Badge>
              </div>
            </div>
          )}
        </ConfirmModal>

        {/* CSV Upload Modal */}
        <CSVUploadModal
          open={showCSVUpload}
          onClose={handleCloseCSVUpload}
          onSuccess={handleCSVSuccess}
          examId={examId}
          examType={exam?.type}
        />

        {/* Question View Modal */}
        <QuestionViewModal
          open={showViewModal}
          question={viewingQuestion}
          onClose={handleCloseViewModal}
        />
      </main>
    </AdminRoleShell>
  );
}

export default function QuestionsPage({ params }: QuestionsPageProps) {
  return (
    <AdminPageWrapper>
      <QuestionsPageContent params={params} />
    </AdminPageWrapper>
  );
}

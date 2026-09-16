'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { AdminRoleShell } from '@/components/role-area/AdminRoleShell';
import AssignmentSubmissionDataTable from '@/components/AssignmentSubmissionDataTable';
import PageSection from '@/components/PageSection';
import WelcomeSection from '@/components/WelcomeSection';
import AdminPageWrapper from '@/components/AdminPageWrapper';
import { Assignment, AssignmentSubmission, SubmissionFilters, PdfAnnotations } from '@/types/assignment';
import { PdfSubmissionAnnotator } from '@/components/assignments/PdfSubmissionAnnotator';
import { Button } from '@/components/ui/button';
import { AttractiveInput } from '@/components/ui/attractive-input';
import { AttractiveSelect } from '@/components/ui/attractive-select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { LuArrowLeft as ArrowLeft, LuSearch as Search, LuX as X, LuSettings as Settings, LuFilter as Filter, LuDownload as Download, LuFileText as LuFileText, LuUsers as Users, LuTarget as Target, LuClock as Clock, LuCheck as Check, LuLoader as Loader2, LuUser as User, LuCalendar as Calendar } from 'react-icons/lu';
import { AttractiveTextarea } from '@/components/ui/attractive-textarea';
import ConfirmModal from '@/components/ui/confirm-modal';
import { assignmentsStaffService } from '@/services/assignmentsStaffService';

function AssignmentSubmissionsPageContent() {
  const params = useParams();
  const assignmentId = params.id as string;
  
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [filters, setFilters] = useState<SubmissionFilters>({
    status: 'all',
    isLate: undefined,
    page: 1,
    limit: 10,
    sortBy: 'submittedAt',
    sortOrder: 'desc'
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [showGradeDrawer, setShowGradeDrawer] = useState(false);
  const [gradingSubmission, setGradingSubmission] = useState<AssignmentSubmission | null>(null);
  const [gradeScore, setGradeScore] = useState<string>('');
  const [gradeFeedback, setGradeFeedback] = useState<string>('');
  const [gradePdfAnnotations, setGradePdfAnnotations] = useState<PdfAnnotations | null>(null);
  const [grading, setGrading] = useState(false);
  const [gradeError, setGradeError] = useState<string | null>(null);
  const [showViewDrawer, setShowViewDrawer] = useState(false);
  const [viewSubmission, setViewSubmission] = useState<AssignmentSubmission | null>(null);
  const [submissionToDelete, setSubmissionToDelete] = useState<AssignmentSubmission | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAssignment = async () => {
    try {
      const response = await assignmentsStaffService.getAssignment(assignmentId);
      const data = await response.json();
      
      if (response.ok) {
        setAssignment(data.data.assignment);
      } else {
        console.error('Failed to fetch assignment:', data.error);
      }
    } catch (error) {
      console.error('Error fetching assignment:', error);
    }
  };

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: (filters.page ?? 1).toString(),
        limit: (filters.limit ?? 10).toString(),
        ...(filters.status !== 'all' && { status: filters.status }),
        ...(filters.isLate !== undefined && { isLate: filters.isLate.toString() }),
        ...(filters.sortBy && { sortBy: filters.sortBy }),
        ...(filters.sortOrder && { sortOrder: filters.sortOrder }),
      });

      const response = await assignmentsStaffService.listSubmissions(
        assignmentId,
        queryParams.toString(),
      );
      const data = await response.json();
      
      if (response.ok) {
        setSubmissions(data.data.submissions || []);
        setPagination(data.data.pagination || {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0
        });
      } else {
        console.error('Failed to fetch submissions:', data.error);
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssignment();
  }, [assignmentId]);

  useEffect(() => {
    fetchSubmissions();
  }, [filters, assignmentId]);

  const handleSearchChange = (searchValue: string) => {
    setSearch(searchValue);
    // Note: Search functionality would need to be implemented in the API
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({
      ...prev,
      page
    }));
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
      status: 'all',
      isLate: undefined,
      page: 1,
      limit: 10,
      sortBy: 'submittedAt',
      sortOrder: 'desc'
    });
    setSearch('');
    setShowFilterDrawer(false);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.status !== 'all') count++;
    if (filters.isLate !== undefined) count++;
    if (filters.sortBy !== 'submittedAt') count++;
    if (filters.sortOrder !== 'desc') count++;
    return count;
  };

  const handleDownloadSubmission = async (submission: AssignmentSubmission) => {
    try {
      const files = submission.files || [];
      if (!files.length) return;
      for (const f of files) {
        const a = document.createElement('a');
        a.href = f.url;
        a.download = f.name || 'submission-file';
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (e) {
      console.error('Download failed:', e);
    }
  };

  const openViewDrawer = (submission: AssignmentSubmission) => {
    setShowFilterDrawer(false);
    setViewSubmission(submission);
    setShowViewDrawer(true);
  };

  const openGradeDrawer = (submission: AssignmentSubmission) => {
    // Ensure only one drawer is open at a time
    setShowFilterDrawer(false);
    setGradingSubmission(submission);
    setGradeScore(submission.score !== undefined ? String(submission.score) : '');
    setGradeFeedback(submission.feedback || '');
    setGradePdfAnnotations(submission.pdfAnnotations || null);
    setGradeError(null);
    setShowGradeDrawer(true);
  };

  const handleConfirmDeleteSubmission = async () => {
    if (!submissionToDelete) return;
    setDeleting(true);
    try {
      const res = await assignmentsStaffService.deleteSubmission(
        assignmentId,
        submissionToDelete._id,
      );
      const data = await res.json();
      if (res.ok) {
        setSubmissionToDelete(null);
        fetchSubmissions();
      } else {
        alert(data?.error || 'Failed to delete submission');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to delete submission');
    } finally {
      setDeleting(false);
    }
  };

  const submitGrade = async () => {
    if (!gradingSubmission) return;
    setGradeError(null);
    const parsed = Number(gradeScore);
    if (Number.isNaN(parsed) || parsed < 0) {
      setGradeError('Please enter a valid non-negative score.');
      return;
    }
    try {
      setGrading(true);
      const res = await assignmentsStaffService.gradeSubmission(
        assignmentId,
        gradingSubmission._id,
        {
          score: parsed,
          feedback: gradeFeedback || undefined,
          ...(gradePdfAnnotations ? { pdfAnnotations: gradePdfAnnotations } : {}),
        },
      );
      const data = await res.json();
      if (res.ok) {
        setShowGradeDrawer(false);
        setGradingSubmission(null);
        fetchSubmissions();
      } else {
        setGradeError(data?.error || 'Failed to grade submission.');
      }
    } finally {
      setGrading(false);
    }
  };

  const handleExportSubmissions = () => {
    // Implement export functionality
    console.log('Export submissions');
  };

  if (!assignment) {
    return (
      <AdminRoleShell>
        <main className="relative z-10 p-2 sm:p-4">
          <div className="text-center py-12">
            <LuFileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Assignment not found</h3>
            <p className="text-gray-500">The assignment you're looking for doesn't exist.</p>
          </div>
        </main>
      </AdminRoleShell>
    );
  }

  return (
    <AdminRoleShell>
      <main className="relative z-10 p-2 sm:p-4">
        {/* Welcome Section */}
        <WelcomeSection 
          title={`Submissions for "${assignment.title}"`}
          description="View and manage student submissions for this assignment"
        />

        {/* Assignment LuInfo */}
        <PageSection 
          title="Assignment Details"
          className="mb-2 sm:mb-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-lg border" style={{
              backgroundColor: 'rgba(123, 44, 191, 0.1)',
              borderColor: 'rgba(123, 44, 191, 0.2)',
            }}>
              <LuFileText className="w-5 h-5" style={{ color: '#7B2CBF' }} />
              <div>
                <div className="text-sm font-medium" style={{ color: '#7B2CBF' }}>Assignment Type</div>
                <div className="text-lg font-semibold capitalize" style={{ color: '#7B2CBF' }}>
                  {assignment.type.replace('_', ' ')}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-green-50 rounded-lg border border-green-200">
              <Target className="w-5 h-5 text-green-600" />
              <div>
                <div className="text-sm font-medium text-green-900">Total Marks</div>
                <div className="text-lg font-semibold text-green-800">{assignment.totalMarks}</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 rounded-lg border" style={{
              backgroundColor: 'rgba(168, 85, 247, 0.1)',
              borderColor: 'rgba(168, 85, 247, 0.2)',
            }}>
              <Users className="w-5 h-5" style={{ color: '#A855F7' }} />
              <div>
                <div className="text-sm font-medium" style={{ color: '#A855F7' }}>Submissions</div>
                <div className="text-lg font-semibold" style={{ color: '#A855F7' }}>{submissions.length}</div>
              </div>
            </div>
          </div>
        </PageSection>

        {/* Submissions Table */}
        <PageSection 
          title="Student Submissions"
          description={
            getActiveFiltersCount() > 0 
              ? `Showing ${submissions.length} submissions with ${getActiveFiltersCount()} active filter${getActiveFiltersCount() > 1 ? 's' : ''}`
              : `All submissions for this assignment (${submissions.length} total)`
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
                onClick={handleExportSubmissions}
                variant="outline"
                className="flex items-center gap-2 border-2 transition-all duration-200 font-semibold"
                style={{
                  borderColor: '#10B981',
                  backgroundColor: 'transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#14B8A6';
                  e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#10B981';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Download className="w-4 h-4" style={{ color: '#10B981' }} />
                <span>Export</span>
              </Button>
            </div>
          }
        >
          <div className="w-full overflow-hidden">
            <AssignmentSubmissionDataTable
              submissions={submissions}
              loading={loading}
              onGrade={openGradeDrawer}
              onView={openViewDrawer}
              onDownload={handleDownloadSubmission}
              onDelete={(s) => setSubmissionToDelete(s)}
              pagination={pagination}
              onPageChange={handlePageChange}
              variant="table"
            />
          </div>
        </PageSection>

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
                    Filter and sort submissions to find exactly what you're looking for
                  </p>
                </div>
              </div>
            </SheetHeader>
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* Search Input */}
              <div>
                <AttractiveInput
                  type="text"
                  label="Search Submissions"
                  placeholder="Search by student name..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  icon="search"
                  variant="default"
                  colorScheme="primary"
                  size="md"
                  helperText="Find submissions by typing keywords"
                />
              </div>
              
              {/* Status Filter */}
              <div className="bg-white rounded-lg p-3 shadow-md hover:shadow-lg transition-all duration-200" style={{
                border: '1px solid rgba(123, 44, 191, 0.2)',
              }}>
                <AttractiveSelect
                  label="Status"
                  icon="tag"
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  colorScheme="primary"
                  size="md"
                  options={[
                    { value: 'all', label: 'All Status' },
                    { value: 'draft', label: 'Draft' },
                    { value: 'submitted', label: 'Submitted' },
                    { value: 'graded', label: 'Graded' },
                    { value: 'returned', label: 'Returned' }
                  ]}
                />
              </div>

              {/* Late Submission Filter */}
              <div className="bg-white rounded-lg p-3 shadow-md hover:shadow-lg transition-all duration-200" style={{
                border: '1px solid rgba(16, 185, 129, 0.2)',
              }}>
                <AttractiveSelect
                  label="Late Submissions"
                  icon="clock"
                  value={filters.isLate === undefined ? 'all' : filters.isLate.toString()}
                  onChange={(e) => handleFilterChange('isLate', e.target.value === 'all' ? undefined : e.target.value === 'true')}
                  colorScheme="success"
                  size="md"
                  options={[
                    { value: 'all', label: 'All Submissions' },
                    { value: 'true', label: 'Late Only' },
                    { value: 'false', label: 'On Time Only' }
                  ]}
                />
              </div>

              {/* Sort Options */}
              <div className="bg-white rounded-lg p-3 shadow-md hover:shadow-lg transition-all duration-200" style={{
                border: '1px solid rgba(255, 107, 53, 0.2)',
              }}>
                <div className="space-y-3">
                  <AttractiveSelect
                    label="Sort By"
                    icon="arrow"
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                    colorScheme="warning"
                    size="md"
                    options={[
                      { value: 'submittedAt', label: 'Submission Date' },
                      { value: 'score', label: 'Score' },
                      { value: 'createdAt', label: 'Created Date' }
                    ]}
                  />
                  <AttractiveSelect
                    label="Sort Order"
                    icon="arrow"
                    value={filters.sortOrder}
                    onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                    colorScheme="warning"
                    size="md"
                    options={[
                      { value: 'desc', label: 'Descending' },
                      { value: 'asc', label: 'Ascending' }
                    ]}
                  />
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
      {/* View Submission Drawer */}
      <Sheet open={showViewDrawer} onOpenChange={setShowViewDrawer}>
        <SheetContent side="right" className="w-full sm:max-w-lg z-[58] border-l-2" style={{
          backgroundColor: '#FAFAFA',
          borderColor: 'rgba(123, 44, 191, 0.2)',
        }}>
          <SheetHeader>
            <SheetTitle>Submission Details</SheetTitle>
          </SheetHeader>
          <div className="p-2 sm:p-4 space-y-4">
            {/* Student & Meta */}
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{
                  backgroundColor: 'rgba(123, 44, 191, 0.1)',
                }}>
                  <User className="w-4 h-4" style={{ color: '#7B2CBF' }} />
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-gray-900 truncate">
                    {typeof viewSubmission?.student === 'object' ? (viewSubmission?.student as any)?.name : 'Student'}
                  </div>
                  <div className="text-sm text-gray-500 truncate">
                    {typeof viewSubmission?.student === 'object' ? (viewSubmission?.student as any)?.email : ''}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-gray-700">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500" />
                  <span>{viewSubmission?.submittedAt ? new Date(viewSubmission.submittedAt as any).toLocaleString() : 'Not submitted'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-gray-500" />
                  <span>
                    {viewSubmission?.score !== undefined ? `${viewSubmission.score}/${viewSubmission?.maxScore}` : 'Not graded'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <LuFileText className="w-4 h-4 text-gray-500" />
                  <span>Attempt: {viewSubmission?.attemptNumber ?? '-'}</span>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-gray-200">
              <div className="text-sm font-semibold text-gray-700 mb-2">Content</div>
              <div className="whitespace-pre-wrap text-gray-900 text-sm">
                {viewSubmission?.content || 'No content provided.'}
              </div>
            </div>

            {/* LuFiles */}
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-gray-200">
              <div className="text-sm font-semibold text-gray-700 mb-2">LuFiles</div>
              {viewSubmission?.files?.length ? (
                <div className="space-y-2">
                  {viewSubmission.files.map((f) => (
                    <div key={f.url} className="flex items-center justify-between border rounded-md p-2">
                      <div className="text-sm text-gray-800 truncate mr-2">{f.name}</div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { const a = document.createElement('a'); a.href = f.url; a.download = f.name || 'submission-file'; a.target = '_blank'; document.body.appendChild(a); a.click(); document.body.removeChild(a); }}
                      >
                        <Download className="w-4 h-4 mr-1" /> Download
                      </Button>
                    </div>
                  ))}
                  <Button
                    className="w-full"
                    onClick={() => viewSubmission && handleDownloadSubmission(viewSubmission)}
                  >
                    <Download className="w-4 h-4 mr-2" /> Download All
                  </Button>
                </div>
              ) : (
                <div className="text-sm text-gray-500">No files uploaded.</div>
              )}
            </div>
          </div>
          <SheetFooter className="p-2 sm:p-4">
            <div className="flex gap-2 w-full">
              <Button 
                variant="outline" 
                className="flex-1 border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                onClick={() => setShowViewDrawer(false)}
                aria-label="Close details"
              >
                <X className="w-4 h-4 mr-2" />
                Close
              </Button>
              <Button 
                className="flex-1 text-white transition-all duration-200"
                onClick={() => setShowViewDrawer(false)}
                aria-label="Done viewing"
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
                <Check className="w-4 h-4 mr-2" />
                Done
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      {/* End View Submission Drawer */}
      {/* Grade Drawer */}
      <Sheet open={showGradeDrawer} onOpenChange={setShowGradeDrawer}>
        <SheetContent side="right" className="w-full sm:max-w-4xl z-[60] border-l-2 overflow-y-auto" style={{
          backgroundColor: '#FAFAFA',
          borderColor: 'rgba(16, 185, 129, 0.2)',
        }}>
          <SheetHeader>
            <SheetTitle>Grade Submission</SheetTitle>
          </SheetHeader>
          <div className="p-2 sm:p-4 space-y-4">
            {gradingSubmission && (assignment?.type === 'pdf' || assignment?.type === 'file_upload') && (() => {
              const pdfFile = gradingSubmission.files?.find((f) =>
                f.name?.toLowerCase().endsWith('.pdf') || f.type === 'application/pdf',
              );
              if (!pdfFile) return null;
              return (
                <PdfSubmissionAnnotator
                  pdfUrl={pdfFile.url}
                  value={gradePdfAnnotations}
                  onChange={setGradePdfAnnotations}
                />
              );
            })()}
            <AttractiveInput
              type="number"
              label="Score"
              placeholder={`0 - ${assignment?.totalMarks ?? ''}`}
              value={gradeScore}
              onChange={(e) => setGradeScore(e.target.value)}
              icon="target"
              min={0}
              max={assignment?.totalMarks ?? undefined}
              step={1}
              helperText={`Enter a score between 0 and ${assignment?.totalMarks ?? 0}`}
              variant="default"
              colorScheme="primary"
              size="md"
              isInvalid={!!gradeError}
            />
            <AttractiveTextarea
              label="Feedback (optional)"
              placeholder="Write feedback for the student..."
              value={gradeFeedback}
              onChange={(e) => setGradeFeedback(e.target.value)}
              rows={5}
              variant="default"
              colorScheme="primary"
              size="md"
              helperText="You can leave this blank."
            />
            {gradeError && (
              <div className="text-sm text-red-600">{gradeError}</div>
            )}
          </div>
          <SheetFooter className="p-2 sm:p-4">
            <div className="flex gap-2 w-full">
              <Button 
                variant="outline" 
                className="flex-1 border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                onClick={() => setShowGradeDrawer(false)}
                aria-label="Cancel grading"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button 
                className="flex-1 text-white transition-all duration-200"
                onClick={submitGrade}
                disabled={grading || gradeScore === ''}
                aria-label="Save grade"
                style={{
                  background: "linear-gradient(135deg, #10B981 0%, #14B8A6 100%)",
                  boxShadow: "0 4px 15px rgba(16, 185, 129, 0.3)",
                }}
                onMouseEnter={(e) => {
                  if (!grading && gradeScore !== '') {
                    e.currentTarget.style.background = "linear-gradient(135deg, #059669 0%, #0D9488 100%)";
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(16, 185, 129, 0.4)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "linear-gradient(135deg, #10B981 0%, #14B8A6 100%)";
                  e.currentTarget.style.boxShadow = "0 4px 15px rgba(16, 185, 129, 0.3)";
                }}
              >
                {grading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Save Grade
                  </>
                )}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      {/* End Grade Drawer */}

        {/* Delete submission confirmation */}
        <ConfirmModal
          open={!!submissionToDelete}
          onClose={() => setSubmissionToDelete(null)}
          onConfirm={handleConfirmDeleteSubmission}
          title="Delete submission"
          description={
            submissionToDelete
              ? `Are you sure you want to delete this submission from ${typeof submissionToDelete.student === 'object' ? (submissionToDelete.student as any)?.name : 'the student'}? This action cannot be undone.`
              : ''
          }
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
          loading={deleting}
        />
    </AdminRoleShell>
  );
}

export default function AssignmentSubmissionsPage() {
  return (
    <AdminPageWrapper>
      <AssignmentSubmissionsPageContent />
    </AdminPageWrapper>
  );
}

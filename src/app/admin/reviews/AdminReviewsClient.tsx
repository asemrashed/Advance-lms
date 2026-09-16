'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAppSelector } from '@/lib/hooks';
import { AdminRoleShell } from '@/components/role-area/AdminRoleShell';
import PageSection from '@/components/PageSection';
import WelcomeSection from '@/components/WelcomeSection';
import ConfirmModal from '@/components/ui/confirm-modal';
import AdminPageWrapper from '@/components/AdminPageWrapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AttractiveInput } from '@/components/ui/attractive-input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import VideoWatermark from '@/components/VideoWatermark';
import { LuSearch as Search, LuX as X, LuStar as Star, LuFilter as Filter, LuEye as Eye, LuEyeOff as EyeOff, LuCheck as Check, LuX as XCircle, LuTrash2 as Trash2, LuThumbsUp as ThumbsUp, LuFlag as Flag, LuUser as User, LuBookOpen as BookOpen, LuCalendar as Calendar, LuArrowUpDown as ArrowUpDown, LuSettings as Settings, LuBan as Ban, LuLockOpen as Unlock, LuPlay as Play, LuDatabase as Database } from 'react-icons/lu';
import { CourseReview, ReviewFilters as ReviewFiltersType } from '@/types/course-review';
import { ReviewCard, type ReviewCardAction } from '@/components/review/ReviewCard';
import { courseReviewService } from '@/services/courseReviewService';
import { coursesStaffService } from '@/services/coursesStaffService';

function ReviewsPageContent() {
  const { user } = useAppSelector((state) => state.auth);
  const [videoPlaying, setVideoPlaying] = useState(false);
  
  const [reviews, setReviews] = useState<CourseReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState<CourseReview | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedReview, setSelectedReview] = useState<CourseReview | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    page: 1,
    limit: 20,
    course: 'all',
    student: 'all',
    rating: 'all',
    isApproved: 'all',
    isPublic: 'all',
    reportedCount: 'all',
    sortBy: 'createdAt' as 'createdAt' | 'rating' | 'helpfulVotes',
    sortOrder: 'desc' as 'asc' | 'desc'
  });
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [courses, setCourses] = useState<Array<{_id: string, title: string}>>([]);
  const [students, setStudents] = useState<Array<{ _id: string; name: string }>>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [stats, setStats] = useState({
    totalReviews: 0,
    approvedReviews: 0,
    pendingReviews: 0,
    reportedReviews: 0,
    averageRating: 0
  });
  const [seeding, setSeeding] = useState(false);

  const getReviewStudentName = (review: any) => {
    const custom = review?.displayStudentName?.trim();
    if (custom) return custom;
    return review?.student?.name?.trim() || 'Unknown';
  };

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: filters.page.toString(),
        limit: filters.limit.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.course !== 'all' && { course: filters.course }),
        ...(filters.student !== 'all' && { student: filters.student }),
        ...(filters.rating !== 'all' && { rating: filters.rating }),
        ...(filters.isApproved !== 'all' && { isApproved: filters.isApproved }),
        ...(filters.isPublic !== 'all' && { isPublic: filters.isPublic }),
        ...(filters.reportedCount !== 'all' && { reportedCount: filters.reportedCount }),
        ...(filters.sortBy && { sortBy: filters.sortBy }),
        ...(filters.sortOrder && { sortOrder: filters.sortOrder }),
      });

      const response = await courseReviewService.listAdminReviews(queryParams.toString());
      const data = await response.json();

      if (response.ok) {
        setReviews(data.data.reviews || []);
        setPagination(data.data.pagination || {
          page: 1,
          limit: 20,
          total: 0,
          pages: 0
        });
      } else {
        console.error('Failed to fetch reviews:', data.error);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await coursesStaffService.listCourses('limit=100');
      const data = await response.json();
      if (response.ok) {
        setCourses(data.data.courses || []);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await coursesStaffService.listStudentUsers(100);
      const data = await response.json();
      if (response.ok) {
        setStudents(data.users || []);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await courseReviewService.listAdminReviewsAll();
      const data = await response.json();
      if (response.ok) {
        const reviews = data.data.reviews || [];
        const total = reviews.length;
        const approved = reviews.filter((r: CourseReview) => r.isApproved).length;
        const pending = total - approved;
        const reported = reviews.filter((r: CourseReview) => r.reportedCount > 0).length;
        const avgRating = reviews.length > 0 
          ? reviews.reduce((sum: number, r: CourseReview) => sum + r.rating, 0) / reviews.length 
          : 0;

        setStats({
          totalReviews: total,
          approvedReviews: approved,
          pendingReviews: pending,
          reportedReviews: reported,
          averageRating: Math.round(avgRating * 10) / 10
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [filters]);

  useEffect(() => {
    fetchCourses();
    fetchStudents();
    fetchStats();
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

  const handleBlockStudent = async (studentId: string, block: boolean) => {
    if (!studentId) {
      alert('Student ID is missing');
      return;
    }

    try {
      console.log('Blocking/unblocking student:', { studentId, block });
      const response = await courseReviewService.blockStudentReviews(studentId, { block });

      const data = await response.json();

      if (response.ok) {
        console.log('Student block status updated successfully:', data);
        alert(data.message || (block ? 'Student blocked successfully' : 'Student unblocked successfully'));
        fetchReviews(); // Refresh reviews to show updated status
        fetchStats();
      } else {
        console.error('Failed to update student block status:', data);
        alert(data.error || 'Failed to update student block status');
      }
    } catch (error) {
      console.error('Error updating student block status:', error);
      alert('Error updating student block status: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleModerateReview = async (reviewId: string, action: string) => {
    try {
      const response = await courseReviewService.updateAdminReview(reviewId, { action });

      const data = await response.json();

      if (response.ok) {
        console.log(`Review ${action} successfully`);
        fetchReviews();
        fetchStats();
        // Update selected review if modal is open
        if (selectedReview && selectedReview._id === reviewId) {
          setSelectedReview({ ...selectedReview, ...data.data });
        }
      } else {
        console.error(`Failed to ${action} review:`, data.error);
      }
    } catch (error) {
      console.error(`Error ${action} review:`, error);
    }
  };

  const toggleReviewDisplay = async (reviewId: string, currentStatus: boolean) => {
    try {
      const currentValue = currentStatus === true;
      const newValue = !currentValue;

      const response = await courseReviewService.updateAdminReview(reviewId, {
        isDisplayed: newValue,
      });

      if (response.ok) {
        // Update local state
        setReviews(prevReviews =>
          prevReviews.map(review =>
            review._id === reviewId
              ? { ...review, isDisplayed: newValue }
              : review
          )
        );
        // Update selected review if modal is open
        if (selectedReview && selectedReview._id === reviewId) {
          setSelectedReview({ ...selectedReview, isDisplayed: newValue } as CourseReview);
        }
        fetchStats();
      } else {
        const data = await response.json();
        console.error('Failed to update review:', data.error);
        alert('Failed to update review display status');
      }
    } catch (error) {
      console.error('Error updating review:', error);
      alert('Error updating review display status');
    }
  };

  const handleDeleteReview = (review: CourseReview) => {
    setReviewToDelete(review);
    setShowDeleteModal(true);
  };

  const confirmDeleteReview = async () => {
    if (!reviewToDelete) return;

    setDeleting(true);
    try {
      const response = await courseReviewService.deleteAdminReview(reviewToDelete._id);

      const data = await response.json();

      if (response.ok) {
        console.log('Review deleted successfully');
        fetchReviews();
        fetchStats();
        setShowDeleteModal(false);
        setReviewToDelete(null);
      } else {
        console.error('Failed to delete review:', data.error);
      }
    } catch (error) {
      console.error('Error deleting review:', error);
    } finally {
      setDeleting(false);
    }
  };

  const cancelDeleteReview = () => {
    setShowDeleteModal(false);
    setReviewToDelete(null);
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
      limit: 20,
      course: 'all',
      student: 'all',
      rating: 'all',
      isApproved: 'all',
      isPublic: 'all',
      reportedCount: 'all',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
    setSearch('');
    setShowFilterDrawer(false);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.search) count++;
    if (filters.course !== 'all') count++;
    if (filters.student !== 'all') count++;
    if (filters.rating !== 'all') count++;
    if (filters.isApproved !== 'all') count++;
    if (filters.isPublic !== 'all') count++;
    if (filters.reportedCount !== 'all') count++;
    if (filters.sortBy !== 'createdAt') count++;
    if (filters.sortOrder !== 'desc') count++;
    return count;
  };

  const handleSeedReviews = async () => {
    if (!confirm('This will create reviews for all courses. Existing reviews will be skipped. Continue?')) {
      return;
    }

    setSeeding(true);
    try {
      const response = await courseReviewService.seedReviews();

      const data = await response.json();

      if (response.ok) {
        alert(`Reviews seeded successfully!\n\nCreated: ${data.data.reviewsCreated} reviews\nEnrollments created: ${data.data.enrollmentsCreated}\nSkipped (already exist): ${data.data.reviewsSkipped}`);
        // Refresh reviews and stats
        fetchReviews();
        fetchStats();
      } else {
        alert(`Failed to seed reviews: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error seeding reviews:', error);
      alert(`Error seeding reviews: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <AdminRoleShell>
      <main className="relative z-10 p-2 sm:p-4">
        {/* Welcome Section */}
        <WelcomeSection 
          title="Review Management"
          description="Moderate and manage course reviews from students"
        />

        {/* Reviews Table */}
        <PageSection 
          title="Reviews"
          description={
            getActiveFiltersCount() > 0 
              ? `Showing ${reviews.length} reviews with ${getActiveFiltersCount()} active filter${getActiveFiltersCount() > 1 ? 's' : ''}`
              : `All reviews in the system (${reviews.length} total)`
          }
          className="mb-2 sm:mb-4"
          actions={
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <Button 
                onClick={handleSeedReviews}
                disabled={seeding}
                className="flex items-center gap-2 text-white font-semibold transition-all duration-200 disabled:opacity-50"
                style={{
                  background: seeding 
                    ? "linear-gradient(135deg, #9CA3AF 0%, #6B7280 100%)"
                    : "linear-gradient(135deg, #10B981 0%, #14B8A6 100%)",
                  boxShadow: seeding ? "none" : "0 4px 15px rgba(16, 185, 129, 0.3)",
                }}
                onMouseEnter={(e) => {
                  if (!seeding) {
                    e.currentTarget.style.background = "linear-gradient(135deg, #059669 0%, #0D9488 100%)";
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(16, 185, 129, 0.4)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!seeding) {
                    e.currentTarget.style.background = "linear-gradient(135deg, #10B981 0%, #14B8A6 100%)";
                    e.currentTarget.style.boxShadow = "0 4px 15px rgba(16, 185, 129, 0.3)";
                  }
                }}
              >
                <Database className={`w-4 h-4 ${seeding ? 'animate-spin' : ''}`} />
                <span>{seeding ? 'Seeding Reviews...' : 'Seed Reviews'}</span>
              </Button>
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
            </div>
          }
        >
          <div className="w-full overflow-hidden">
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, index) => (
                  <div key={index} className="bg-white rounded-lg p-4 shadow-sm border border-gray-200 animate-pulse">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="h-4 bg-gray-300 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                      </div>
                      <div className="h-8 bg-gray-300 rounded w-20"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => {
                  const studentObj =
                    typeof review.student === "object" && review.student ? review.student : null;
                  const studentId = studentObj?._id ?? null;

                  const actions: ReviewCardAction[] = [
                    {
                      id: "view",
                      label: "View",
                      icon: <Eye className="w-4 h-4" />,
                      onClick: () => {
                        setSelectedReview(review);
                        setShowReviewModal(true);
                      },
                      className: "border-blue-500 text-blue-600 hover:bg-blue-50",
                    },
                  ];

                  if (!review.isApproved) {
                    actions.push({
                      id: "approve",
                      label: "Approve",
                      icon: <Check className="w-4 h-4" />,
                      onClick: () => handleModerateReview(review._id, "approve"),
                      prominent: true,
                    });
                  } else {
                    actions.push({
                      id: "disapprove",
                      label: "Disapprove",
                      icon: <XCircle className="w-4 h-4" />,
                      onClick: () => handleModerateReview(review._id, "disapprove"),
                      className: "border-yellow-500 text-yellow-600 hover:bg-yellow-50",
                    });
                  }

                  if (review.isPublic) {
                    actions.push({
                      id: "private",
                      label: "Hide",
                      icon: <EyeOff className="w-4 h-4" />,
                      onClick: () => handleModerateReview(review._id, "make_private"),
                      className: "border-gray-500 text-gray-600 hover:bg-gray-50",
                    });
                  } else {
                    actions.push({
                      id: "public",
                      label: "Show",
                      icon: <Eye className="w-4 h-4" />,
                      onClick: () => handleModerateReview(review._id, "make_public"),
                      className:
                        "border-[#7B2CBF] text-[#7B2CBF] bg-transparent hover:bg-violet-50",
                    });
                  }

                  if (review.reportedCount > 0) {
                    actions.push({
                      id: "reset",
                      label: "Reset Reports",
                      icon: <Flag className="w-4 h-4" />,
                      onClick: () => handleModerateReview(review._id, "reset_reports"),
                      className: "border-purple-500 text-purple-600 hover:bg-purple-50",
                    });
                  }

                  if (studentId) {
                    if (studentObj?.isBlockedFromReviews) {
                      actions.push({
                        id: "unblock",
                        label: "Unblock",
                        icon: <Unlock className="w-4 h-4" />,
                        onClick: () => handleBlockStudent(studentId, false),
                        className: "border-green-500 text-green-600 hover:bg-green-50",
                      });
                    } else {
                      actions.push({
                        id: "block",
                        label: "Block Student",
                        icon: <Ban className="w-4 h-4" />,
                        onClick: () => handleBlockStudent(studentId, true),
                        className: "border-orange-500 text-orange-600 hover:bg-orange-50",
                      });
                    }
                  }

                  actions.push({
                    id: "delete",
                    label: "Delete",
                    icon: <Trash2 className="w-4 h-4" />,
                    onClick: () => handleDeleteReview(review),
                    className: "border-red-500 text-red-600 hover:bg-red-50",
                  });

                  return (
                    <ReviewCard
                      key={review._id}
                      variant="admin"
                      review={review}
                      studentDisplayLabel={getReviewStudentName(review)}
                      actions={actions}
                    />
                  );
                })}
                
                {reviews.length === 0 && !loading && (
                  <div className="text-center py-8">
                    <Star className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews found</h3>
                    <p className="text-gray-500">No reviews match your current filters.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </PageSection>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <PageSection className="mb-2 sm:mb-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} reviews
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-gray-500">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.pages}
                >
                  Next
                </Button>
              </div>
            </div>
          </PageSection>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          open={showDeleteModal}
          onClose={cancelDeleteReview}
          onConfirm={confirmDeleteReview}
          title="Delete Review"
          description={`Are you sure you want to delete this review? This action cannot be undone.`}
          confirmText="Delete Review"
          cancelText="Cancel"
          variant="danger"
          loading={deleting}
        />

        {/* Review View Modal */}
        <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
          <DialogContent className="sm:max-w-3xl max-h-[min(85dvh,920px)] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                Review Details
              </DialogTitle>
              <DialogDescription>
                View complete review information and manage display settings
              </DialogDescription>
            </DialogHeader>
            
            {selectedReview && (
              <div className="space-y-6">
                {/* Student Info */}
                <div className="flex items-center gap-4 pb-4 border-b">
                  {selectedReview.student && typeof selectedReview.student === 'object' && selectedReview.student.avatar && (
                    <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-gray-200">
                      <Image
                        src={selectedReview.student.avatar}
                        alt={getReviewStudentName(selectedReview)}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {getReviewStudentName(selectedReview)}
                      {selectedReview.student && typeof selectedReview.student === 'object' && selectedReview.student.isBlockedFromReviews && (
                        <Badge variant="outline" className="ml-2 bg-red-50 text-red-700 border-red-200">
                          <Ban className="w-3 h-3 mr-1" />
                          Blocked
                        </Badge>
                      )}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {typeof selectedReview.course === 'object' 
                        ? selectedReview.course?.title || 'Unknown Course'
                        : 'Unknown Course'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-5 h-5 ${
                          i < selectedReview.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                    <span className="ml-2 text-sm font-medium text-gray-700">
                      {selectedReview.rating}/5
                    </span>
                  </div>
                </div>

                {/* Status Badges */}
                <div className="flex flex-wrap gap-2">
                  {selectedReview.isApproved && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <Check className="w-3 h-3 mr-1" />
                      Approved
                    </Badge>
                  )}
                  {!selectedReview.isApproved && (
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                      <Eye className="w-3 h-3 mr-1" />
                      Pending
                    </Badge>
                  )}
                  {selectedReview.isPublic && (
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                      Public
                    </Badge>
                  )}
                  {!selectedReview.isPublic && (
                    <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                      <EyeOff className="w-3 h-3 mr-1" />
                      Private
                    </Badge>
                  )}
                  {(selectedReview.isDisplayed === true) && (
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                      Displayed
                    </Badge>
                  )}
                  {selectedReview.reviewType === 'video' && (
                    <Badge variant="outline" className="bg-pink-50 text-pink-700 border-pink-200">
                      <Play className="w-3 h-3 mr-1" />
                      Video Review
                    </Badge>
                  )}
                  {selectedReview.isVerified && (
                    <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                      Verified Student
                    </Badge>
                  )}
                  {selectedReview.reportedCount > 0 && (
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                      <Flag className="w-3 h-3 mr-1" />
                      Reported ({selectedReview.reportedCount})
                    </Badge>
                  )}
                </div>

                {/* Review Title */}
                {selectedReview.title && (
                  <div>
                    <h4 className="text-base font-semibold text-gray-900 mb-2">Review Title</h4>
                    <p className="text-gray-700">{selectedReview.title}</p>
                  </div>
                )}

                {/* Text Review Comment */}
                {selectedReview.reviewType === 'text' && selectedReview.comment && (
                  <div>
                    <h4 className="text-base font-semibold text-gray-900 mb-2">Review Comment</h4>
                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                      {selectedReview.comment}
                    </p>
                  </div>
                )}

                  {/* Video Preview */}
                  {selectedReview.reviewType === 'video' && selectedReview.videoUrl && (
                    <div className="space-y-3">
                      {selectedReview.videoUrl.includes('youtube.com/embed') && (
                        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-gray-900">
                          {!videoPlaying && selectedReview.videoThumbnail ? (
                            <div 
                              className="relative w-full h-full cursor-pointer group"
                              onClick={() => setVideoPlaying(true)}
                            >
                              <Image
                                src={selectedReview.videoThumbnail}
                                alt="Video thumbnail"
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 100vw, 50vw"
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                                <div className="w-20 h-20 rounded-full bg-red-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                  <Play className="w-10 h-10 text-white ml-1" />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <>
                              <iframe
                                src={videoPlaying ? `${selectedReview.videoUrl}?autoplay=1` : selectedReview.videoUrl}
                                className="h-full w-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                title="YouTube video player"
                              />
                              <VideoWatermark />
                            </>
                          )}
                        </div>
                      )}
         
                    </div>
                  )}

                

                {/* Review Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Helpful Votes</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {selectedReview.helpfulVotes || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Reported Count</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {selectedReview.reportedCount || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Created At</p>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(selectedReview.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Last Updated</p>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(selectedReview.updatedAt || selectedReview.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Display Toggle */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 mb-1">Display Status</p>
                    <p className="text-xs text-gray-500">
                      {selectedReview.isDisplayed 
                        ? 'This review is currently displayed on course details pages'
                        : 'This review is hidden from course details pages'}
                    </p>
                  </div>
                  <Checkbox
                    checked={selectedReview.isDisplayed || false}
                    onCheckedChange={() => {
                      toggleReviewDisplay(selectedReview._id, selectedReview.isDisplayed || false);
                    }}
                    className="h-5 w-5"
                  />
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  {!selectedReview.isApproved && (
                    <Button
                      size="sm"
                      onClick={() => {
                        handleModerateReview(selectedReview._id, 'approve');
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                  )}
                  {selectedReview.isApproved && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        handleModerateReview(selectedReview._id, 'disapprove');
                      }}
                      className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Disapprove
                    </Button>
                  )}
                  {selectedReview.isPublic ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        handleModerateReview(selectedReview._id, 'make_private');
                      }}
                      className="border-gray-500 text-gray-600 hover:bg-gray-50"
                    >
                      <EyeOff className="w-4 h-4 mr-1" />
                      Make Private
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        handleModerateReview(selectedReview._id, 'make_public');
                      }}
                      className="border-blue-500 text-blue-600 hover:bg-blue-50"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Make Public
                    </Button>
                  )}
                  {selectedReview.reportedCount > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        handleModerateReview(selectedReview._id, 'reset_reports');
                      }}
                      className="border-purple-500 text-purple-600 hover:bg-purple-50"
                    >
                      <Flag className="w-4 h-4 mr-1" />
                      Reset Reports
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowReviewModal(false);
                      handleDeleteReview(selectedReview);
                    }}
                    className="border-red-500 text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

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
                    Filter and sort reviews to find exactly what you're looking for
                  </p>
                </div>
              </div>
            </SheetHeader>
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* Search Input */}
              <div>
                <AttractiveInput
                  type="text"
                  label="Search Reviews"
                  placeholder="Search by title, comment, or student name..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  icon="search"
                  variant="default"
                  colorScheme="primary"
                  size="md"
                  helperText="Find reviews by typing keywords"
                />
              </div>
              
              {/* Course Filter */}
              <div className="bg-white rounded-lg p-3 shadow-md hover:shadow-lg transition-all duration-200" style={{
                border: '1px solid rgba(123, 44, 191, 0.2)',
              }}>
                <label className="flex text-sm font-semibold text-foreground mb-2 items-center gap-2">
                  <BookOpen className="w-4 h-4" style={{ color: '#7B2CBF' }} />
                  Course
                </label>
                <select
                  value={filters.course}
                  onChange={(e) => handleFilterChange('course', e.target.value)}
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
                  <option value="all">All Courses</option>
                  {courses.map((course) => (
                    <option key={course._id} value={course._id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Student Filter */}
              <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 border border-green-200 shadow-md hover:shadow-lg transition-all duration-200">
                <label className="flex text-sm font-semibold text-foreground mb-2 items-center gap-2">
                  <User className="w-4 h-4 text-green-600" />
                  Student
                </label>
                <select
                  value={filters.student}
                  onChange={(e) => handleFilterChange('student', e.target.value)}
                  className="w-full h-10 px-3 py-2 border-2 border-green-300 hover:border-green-400 focus:border-green-500 focus:ring-green-500/20 focus:shadow-lg focus:shadow-green-500/10 rounded-lg bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all duration-200 font-medium text-sm"
                >
                  <option value="all">All Students</option>
                  {students.map((student) => (
                    <option key={student._id} value={student._id}>
                      {student.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Rating Filter */}
              <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 border border-purple-200 shadow-md hover:shadow-lg transition-all duration-200">
                <label className="flex text-sm font-semibold text-foreground mb-2 items-center gap-2">
                  <Star className="w-4 h-4 text-purple-600" />
                  Rating
                </label>
                <select
                  value={filters.rating}
                  onChange={(e) => handleFilterChange('rating', e.target.value)}
                  className="w-full h-10 px-3 py-2 border-2 border-purple-300 hover:border-purple-400 focus:border-purple-500 focus:ring-purple-500/20 focus:shadow-lg focus:shadow-purple-500/10 rounded-lg bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all duration-200 font-medium text-sm"
                >
                  <option value="all">All Ratings</option>
                  <option value="5">5 Stars</option>
                  <option value="4">4 Stars</option>
                  <option value="3">3 Stars</option>
                  <option value="2">2 Stars</option>
                  <option value="1">1 Star</option>
                </select>
              </div>

              {/* Approval Status Filter */}
              <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 border border-orange-200 shadow-md hover:shadow-lg transition-all duration-200">
                <label className="flex text-sm font-semibold text-foreground mb-2 items-center gap-2">
                  <Check className="w-4 h-4 text-orange-600" />
                  Approval Status
                </label>
                <select
                  value={filters.isApproved}
                  onChange={(e) => handleFilterChange('isApproved', e.target.value)}
                  className="w-full h-10 px-3 py-2 border-2 border-orange-300 hover:border-orange-400 focus:border-orange-500 focus:ring-orange-500/20 focus:shadow-lg focus:shadow-orange-500/10 rounded-lg bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all duration-200 font-medium text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="true">Approved</option>
                  <option value="false">Pending</option>
                </select>
              </div>

              {/* Visibility Filter */}
              <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 border border-indigo-200 shadow-md hover:shadow-lg transition-all duration-200">
                <label className="flex text-sm font-semibold text-foreground mb-2 items-center gap-2">
                  <Eye className="w-4 h-4 text-indigo-600" />
                  Visibility
                </label>
                <select
                  value={filters.isPublic}
                  onChange={(e) => handleFilterChange('isPublic', e.target.value)}
                  className="w-full h-10 px-3 py-2 border-2 border-indigo-300 hover:border-indigo-400 focus:border-indigo-500 focus:ring-indigo-500/20 focus:shadow-lg focus:shadow-indigo-500/10 rounded-lg bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all duration-200 font-medium text-sm"
                >
                  <option value="all">All Visibility</option>
                  <option value="true">Public</option>
                  <option value="false">Private</option>
                </select>
              </div>

              {/* Reported Filter */}
              <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 border border-red-200 shadow-md hover:shadow-lg transition-all duration-200">
                <label className="flex text-sm font-semibold text-foreground mb-2 items-center gap-2">
                  <Flag className="w-4 h-4 text-red-600" />
                  Reported
                </label>
                <select
                  value={filters.reportedCount}
                  onChange={(e) => handleFilterChange('reportedCount', e.target.value)}
                  className="w-full h-10 px-3 py-2 border-2 border-red-300 hover:border-red-400 focus:border-red-500 focus:ring-red-500/20 focus:shadow-lg focus:shadow-red-500/10 rounded-lg bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all duration-200 font-medium text-sm"
                >
                  <option value="all">All Reviews</option>
                  <option value="1">Reported (1+)</option>
                  <option value="3">Highly Reported (3+)</option>
                  <option value="5">Very Reported (5+)</option>
                </select>
              </div>

              {/* Sort Options */}
              <div className="bg-white/80 backdrop-blur-sm rounded-lg p-3 border border-gray-200 shadow-md hover:shadow-lg transition-all duration-200">
                <label className="flex text-sm font-semibold text-foreground mb-2 items-center gap-2">
                  <ArrowUpDown className="w-4 h-4 text-gray-600" />
                  Sort By
                </label>
                <div className="space-y-3">
                  <select
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                    className="w-full h-10 px-3 py-2 border-2 border-gray-300 hover:border-gray-400 focus:border-gray-500 focus:ring-gray-500/20 focus:shadow-lg focus:shadow-gray-500/10 rounded-lg bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all duration-200 font-medium text-sm"
                  >
                    <option value="createdAt">Date Created</option>
                    <option value="rating">Rating</option>
                    <option value="helpfulVotes">Helpful Votes</option>
                  </select>
                  <select
                    value={filters.sortOrder}
                    onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
                    className="w-full h-10 px-3 py-2 border-2 border-gray-300 hover:border-gray-400 focus:border-gray-500 focus:ring-gray-500/20 focus:shadow-lg focus:shadow-gray-500/10 rounded-lg bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all duration-200 font-medium text-sm"
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

export default function ReviewsPage() {
  return (
    <AdminPageWrapper>
      <ReviewsPageContent />
    </AdminPageWrapper>
  );
}

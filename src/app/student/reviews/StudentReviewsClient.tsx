'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { StudentRoleShell } from '@/components/role-area/StudentRoleShell';
import PageSection from '@/components/PageSection';
import WelcomeSection from '@/components/WelcomeSection';
import ConfirmModal from '@/components/ui/confirm-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AttractiveInput } from '@/components/ui/attractive-input';
import { AttractiveTextarea } from '@/components/ui/attractive-textarea';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import VideoWatermark from '@/components/VideoWatermark';
import { LuSearch as Search, LuX as X, LuStar as Star, LuFilter as Filter, LuEye as Eye, LuEyeOff as EyeOff, LuCheck as Check, LuX as XCircle, LuTrash2 as Trash2, LuThumbsUp as ThumbsUp, LuFlag as Flag, LuUser as User, LuBookOpen as BookOpen, LuCalendar as Calendar, LuArrowUpDown as ArrowUpDown, LuSettings as Settings, LuPlus as Plus, LuPencil as Edit, LuPencil as Pencil, LuVideo as Video, LuFileText as FileText, LuUpload as Upload, LuLoader as Loader2, LuPlay as Play } from 'react-icons/lu';
import { CourseReview, ReviewFilters as ReviewFiltersType } from '@/types/course-review';
import { ReviewCard } from '@/components/review/ReviewCard';
import { courseReviewService } from '@/services/courseReviewService';

function StudentReviewsPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [reviews, setReviews] = useState<CourseReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState<CourseReview | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showWriteModal, setShowWriteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingReview, setEditingReview] = useState<CourseReview | null>(null);
  const [selectedReview, setSelectedReview] = useState<CourseReview | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    page: 1,
    limit: 20,
    course: 'all',
    rating: 'all',
    sortBy: 'createdAt' as 'createdAt' | 'rating' | 'helpfulVotes',
    sortOrder: 'desc' as 'asc' | 'desc'
  });
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [courses, setCourses] = useState<Array<{_id: string, title: string}>>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [stats, setStats] = useState({
    totalReviews: 0,
    averageRating: 0
  });

  // Review form state
  const [reviewForm, setReviewForm] = useState({
    course: '',
    rating: 5,
    reviewType: 'text' as 'text' | 'video',
    title: '',
    comment: '',
    videoUrl: '',
    videoThumbnail: '',
    youtubeUrl: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState(0);
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [videoFileError, setVideoFileError] = useState<string | null>(null);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page: filters.page.toString(),
        limit: filters.limit.toString(),
        student: session?.user?.id || '',
        ...(filters.search && { search: filters.search }),
        ...(filters.course !== 'all' && { course: filters.course }),
        ...(filters.rating !== 'all' && { rating: filters.rating }),
        ...(filters.sortBy && { sortBy: filters.sortBy }),
        ...(filters.sortOrder && { sortOrder: filters.sortOrder }),
      });

      const response = await courseReviewService.listReviews(queryParams.toString());
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
      const response = await courseReviewService.listEnrollmentsForStudent(
        String(session?.user?.id ?? ''),
      );
      const data = await response.json();
      if (response.ok) {
        const enrollments = data.data?.enrollments || data.enrollments || [];
        // Extract unique courses from enrollments
        const courseMap = new Map();
        enrollments.forEach((enrollment: any) => {
          const course = enrollment.courseLuInfo || enrollment.courseInfo;
          if (course && course._id) {
            courseMap.set(course._id.toString(), {
              _id: course._id.toString(),
              title: course.title || 'Unknown Course'
            });
          }
        });
        const courseList = Array.from(courseMap.values());
        setCourses(courseList);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await courseReviewService.listReviewsByStudent(
        String(session?.user?.id ?? ''),
      );
      const data = await response.json();
      if (response.ok) {
        const reviews = data.data.reviews || [];
        const total = reviews.length;
        const avgRating = reviews.length > 0 
          ? reviews.reduce((sum: number, r: CourseReview) => sum + r.rating, 0) / reviews.length 
          : 0;

        setStats({
          totalReviews: total,
          averageRating: Math.round(avgRating * 10) / 10
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user?.id) return;

    fetchReviews();
  }, [
    status,
    session?.user?.id,
    filters.page,
    filters.limit,
    filters.search,
    filters.course,
    filters.rating,
    filters.sortBy,
    filters.sortOrder,
  ]);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user?.id) return;

    fetchCourses();
    fetchStats();
  }, [status, session?.user?.id]);

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

  const handleWriteReview = () => {
    setReviewForm({
      course: '',
      rating: 5,
      reviewType: 'text',
      title: '',
      comment: '',
      videoUrl: '',
      videoThumbnail: '',
      youtubeUrl: ''
    });
    setSelectedVideoFile(null);
    setVideoFileError(null);
    setVideoPlaying(false);
    setShowWriteModal(true);
  };

  const handleEditReview = (review: CourseReview) => {
    setEditingReview(review);
    // Extract YouTube URL if it's a YouTube embed
    let youtubeUrl = '';
    if (review.videoUrl && review.videoUrl.includes('youtube.com/embed/')) {
      const videoId = review.videoUrl.match(/youtube\.com\/embed\/([^?]+)/)?.[1];
      if (videoId) {
        youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
      }
    }
    
    setReviewForm({
      course: typeof review.course === 'string' ? review.course : review.course._id,
      rating: review.rating,
      reviewType: review.reviewType || 'text',
      title: review.title || '',
      comment: review.comment || '',
      videoUrl: review.videoUrl || '',
      videoThumbnail: review.videoThumbnail || '',
      youtubeUrl: youtubeUrl
    });
    setSelectedVideoFile(null);
    setVideoFileError(null);
    setVideoPlaying(false);
    setShowEditModal(true);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  // Extract YouTube video ID from URL
  const extractYouTubeVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^&\n?#\/]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    return null;
  };

  // Generate YouTube embed URL and thumbnail
  const handleYouTubeUrlChange = (url: string) => {
    setReviewForm(prev => ({ ...prev, youtubeUrl: url }));
    
    if (!url.trim()) {
      setReviewForm(prev => ({ 
        ...prev, 
        videoUrl: '', 
        videoThumbnail: '' 
      }));
      return;
    }

    const videoId = extractYouTubeVideoId(url);
    if (videoId) {
      const embedUrl = `https://www.youtube.com/embed/${videoId}`;
      const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      
      setReviewForm(prev => ({
        ...prev,
        videoUrl: embedUrl,
        videoThumbnail: thumbnailUrl
      }));
    } else {
      // Invalid YouTube URL
      setReviewForm(prev => ({ 
        ...prev, 
        videoUrl: '', 
        videoThumbnail: '' 
      }));
    }
  };

  const handleVideoFileSelect = (file: File | null) => {
    if (!file) {
      setSelectedVideoFile(null);
      setVideoFileError(null);
      return;
    }

    // Validate file type
    if (!file.type.startsWith('video/')) {
      setVideoFileError('Please select a valid video file');
      setSelectedVideoFile(null);
      return;
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      setVideoFileError(`File size (${formatFileSize(file.size)}) exceeds the maximum allowed size of 100MB`);
      setSelectedVideoFile(null);
      return;
    }

    // File is valid
    setSelectedVideoFile(file);
    setVideoFileError(null);
  };

  const handleVideoUpload = async (file: File) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      setVideoFileError('Please select a valid video file');
      return;
    }

    // Validate file size (max 100MB)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (file.size > maxSize) {
      setVideoFileError(`File size (${formatFileSize(file.size)}) exceeds the maximum allowed size of 100MB`);
      return;
    }

    setVideoFileError(null);
    setUploadingVideo(true);
    setVideoUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('video', file);

      // Create XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();
      
      const response = await new Promise<Response>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            setVideoUploadProgress(percentComplete);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(new Response(xhr.responseText, {
              status: xhr.status,
              statusText: xhr.statusText,
              headers: new Headers({
                'Content-Type': 'application/json'
              })
            }));
          } else {
            reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
          }
        });

        xhr.addEventListener('error', () => {
          reject(new Error('Network error'));
        });

        xhr.addEventListener('abort', () => {
          reject(new Error('Upload aborted'));
        });

        xhr.open('POST', '/api/course-reviews/upload');
        xhr.send(formData);
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      if (result.success && result.data?.videoUrl) {
        setReviewForm(prev => ({
          ...prev,
          videoUrl: result.data.videoUrl,
          videoThumbnail: result.data.videoThumbnail || ''
        }));
        setSelectedVideoFile(null);
        setVideoFileError(null);
      }
    } catch (error) {
      console.error('Video upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setVideoFileError(errorMessage);
    } finally {
      setUploadingVideo(false);
      setVideoUploadProgress(0);
    }
  };

  const handleRemoveVideo = () => {
    setReviewForm(prev => ({
      ...prev,
      videoUrl: '',
      videoThumbnail: '',
      youtubeUrl: ''
    }));
    setSelectedVideoFile(null);
    setVideoFileError(null);
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  };

  const handleVideoClick = () => {
    videoInputRef.current?.click();
  };


  const handleSubmitReview = async () => {
    if (!reviewForm.course || !reviewForm.rating) {
      alert('Please select a course and rating');
      return;
    }

    // Validate based on review type
    if (reviewForm.reviewType === 'text' && !reviewForm.comment?.trim()) {
      alert('Please provide a comment for text reviews');
      return;
    }

    if (reviewForm.reviewType === 'video' && !reviewForm.videoUrl?.trim() && !reviewForm.youtubeUrl?.trim()) {
      alert('Please provide a YouTube URL for video reviews');
      return;
    }

    setSubmitting(true);
    try {
      const response = await courseReviewService.submitReview(
        editingReview?._id ?? null,
        {
          course: reviewForm.course,
          rating: reviewForm.rating,
          reviewType: reviewForm.reviewType,
          title: reviewForm.title,
          comment: reviewForm.comment,
          videoUrl: reviewForm.videoUrl,
          videoThumbnail: reviewForm.videoThumbnail
        },
      );

      const data = await response.json();

      if (response.ok) {
        console.log('Review submitted successfully');
        fetchReviews();
        fetchStats();
        setShowWriteModal(false);
        setShowEditModal(false);
        setEditingReview(null);
        setReviewForm({
          course: '',
          rating: 5,
          reviewType: 'text',
          title: '',
          comment: '',
          videoUrl: '',
          videoThumbnail: '',
          youtubeUrl: ''
        });
        setSelectedVideoFile(null);
        setVideoFileError(null);
      } else {
        console.error('Failed to submit review:', data.error);
        alert(data.error || 'Failed to submit review');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Error submitting review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoteReview = async (reviewId: string, isHelpful: boolean) => {
    try {
      const response = await courseReviewService.voteReview(reviewId, { isHelpful });

      const data = await response.json();

      if (response.ok) {
        console.log('Vote submitted successfully');
        fetchReviews();
      } else {
        console.error('Failed to vote on review:', data.error);
      }
    } catch (error) {
      console.error('Error voting on review:', error);
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
      const response = await courseReviewService.deleteReview(reviewToDelete._id);

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
      rating: 'all',
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
    if (filters.rating !== 'all') count++;
    if (filters.sortBy !== 'createdAt') count++;
    if (filters.sortOrder !== 'desc') count++;
    return count;
  };

  const renderStars = (rating: number, interactive: boolean = false, onRatingChange?: (rating: number) => void) => {
    return Array.from({ length: 5 }, (_, i) => (
      <button
        key={i}
        type="button"
        onClick={() => interactive && onRatingChange && onRatingChange(i + 1)}
        className={`w-6 h-6 ${
          i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        } ${interactive ? 'hover:text-yellow-400 cursor-pointer' : ''}`}
        disabled={!interactive}
      >
        <Star className="w-full h-full" />
      </button>
    ));
  };

  if (status === 'loading') {
    return (
      <StudentRoleShell>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </StudentRoleShell>
    );
  }

  if (!session?.user) {
    router.push('/login');
    return null;
  }

  return (
    <StudentRoleShell>
      <main className="relative z-10 p-2 sm:p-4">
        {/* Welcome Section */}
        <WelcomeSection 
          title="My Reviews"
          description="Write and manage your course reviews"
        />

        {/* Review Statistics */}
        <PageSection 
          title="Review Statistics"
          className="mb-2 sm:mb-4"
        >
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Reviews</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.totalReviews}</p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Star className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Average Rating</p>
                  <p className="text-2xl font-bold text-green-600">{stats.averageRating}</p>
                </div>
                <div className="p-2 bg-green-100 rounded-lg">
                  <Star className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Courses Available</p>
                  <p className="text-2xl font-bold text-purple-600">{courses.length}</p>
                </div>
                <div className="p-2 bg-purple-100 rounded-lg">
                  <BookOpen className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </div>
          </div>
        </PageSection>

        {/* Filter Actions */}
        <PageSection 
          title="My Reviews"
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
              <Button 
                onClick={handleWriteReview}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Write Review</span>
                <span className="sm:hidden">Write</span>
              </Button>
            </div>
          }
        >
          <div className="text-sm text-gray-600">
            View and manage your course reviews. Write new reviews for courses you've enrolled in.
          </div>
        </PageSection>

        {/* Reviews List */}
        <PageSection 
          title="My Reviews"
          description={
            getActiveFiltersCount() > 0 
              ? `Showing ${reviews.length} reviews with ${getActiveFiltersCount()} active filter${getActiveFiltersCount() > 1 ? 's' : ''}`
              : `Your course reviews (${reviews.length} total)`
          }
          className="mb-2 sm:mb-4"
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
                {reviews.map((review) => (
                  <ReviewCard
                    key={review._id}
                    variant="student"
                    review={review}
                    actions={[
                      {
                        id: "view",
                        label: "View",
                        icon: <Eye className="w-4 h-4" />,
                        onClick: () => {
                          setSelectedReview(review);
                          setShowReviewModal(true);
                        },
                        className: "border-purple-500 text-purple-600 hover:bg-purple-50",
                      },
                      {
                        id: "edit",
                        label: "Edit",
                        icon: <Edit className="w-4 h-4" />,
                        onClick: () => handleEditReview(review),
                        className: "border-blue-500 text-blue-600 hover:bg-blue-50",
                      },
                      {
                        id: "delete",
                        label: "Delete",
                        icon: <Trash2 className="w-4 h-4" />,
                        onClick: () => handleDeleteReview(review),
                        className: "border-red-500 text-red-600 hover:bg-red-50",
                      },
                    ]}
                  />
                ))}
                
                {reviews.length === 0 && !loading && (
                  <div className="text-center py-8">
                    <Star className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No reviews found</h3>
                    <p className="text-gray-500 mb-4">You haven't written any reviews yet.</p>
                    <Button onClick={handleWriteReview} className="bg-blue-600 hover:bg-blue-700 text-white">
                      <Plus className="w-4 h-4 mr-2" />
                      Write Your First Review
                    </Button>
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

        {/* Write Review Modal */}
        <Dialog open={showWriteModal} onOpenChange={setShowWriteModal}>
          <DialogContent className="sm:max-w-3xl bg-gradient-to-br from-blue-50 via-white to-purple-50 border-2 border-blue-200 shadow-2xl flex flex-col max-h-[min(85dvh,920px)]">
            <DialogHeader className="bg-white/90 backdrop-blur-sm rounded-lg p-4 border border-blue-100 shadow-sm flex-shrink-0">
              <DialogTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Star className="w-5 h-5 text-blue-600" />
                Write a Review
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600">
                Share your experience with this course to help other students.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 p-4 overflow-y-auto flex-1 min-h-0">
              <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 border-2 border-blue-200 shadow-lg">
                <label className="block text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  Course
                </label>
                <select
                  value={reviewForm.course}
                  onChange={(e) => setReviewForm(prev => ({ ...prev, course: e.target.value }))}
                  className="w-full h-10 px-3 py-2 border-2 border-blue-300 hover:border-blue-400 focus:border-blue-500 focus:ring-blue-500/20 focus:shadow-lg focus:shadow-blue-500/10 rounded-lg bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all duration-200 font-medium text-sm"
                >
                  <option value="">Select a course</option>
                  {courses.map((course) => (
                    <option key={course._id} value={course._id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 border-2 border-purple-200 shadow-lg">
                <label className="block text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-600" />
                  Review Type
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="reviewType"
                      value="text"
                      checked={reviewForm.reviewType === 'text'}
                      onChange={(e) => setReviewForm(prev => ({ ...prev, reviewType: e.target.value as 'text' | 'video' }))}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Text Review
                    </span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="reviewType"
                      value="video"
                      checked={reviewForm.reviewType === 'video'}
                      onChange={(e) => setReviewForm(prev => ({ ...prev, reviewType: e.target.value as 'text' | 'video' }))}
                      className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Video className="w-4 h-4" />
                      Video Review
                    </span>
                  </label>
                </div>
              </div>

              <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 border-2 border-purple-200 shadow-lg">
                <label className="block text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Star className="w-4 h-4 text-purple-600" />
                  Rating
                </label>
                <div className="flex items-center gap-1">
                  {renderStars(reviewForm.rating, true, (rating) => 
                    setReviewForm(prev => ({ ...prev, rating }))
                  )}
                  <span className="ml-2 text-sm text-gray-600">({reviewForm.rating}/5)</span>
                </div>
              </div>

              <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 border-2 border-gray-200 shadow-lg">
                <AttractiveInput
                  type="text"
                  label="Review Title (Optional)"
                  placeholder="Give your review a title..."
                  value={reviewForm.title}
                  onChange={(e) => setReviewForm(prev => ({ ...prev, title: e.target.value }))}
                  variant="default"
                  colorScheme="primary"
                  size="md"
                />
              </div>

              {reviewForm.reviewType === 'text' && (
                <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 border-2 border-gray-200 shadow-lg">
                  <AttractiveTextarea
                    label="Review Comment"
                    placeholder="Share your thoughts about this course..."
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm(prev => ({ ...prev, comment: e.target.value }))}
                    rows={4}
                    variant="default"
                    colorScheme="primary"
                    size="md"
                  />
                </div>
              )}

              {reviewForm.reviewType === 'video' && (
                <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 border-2 border-purple-200 shadow-lg space-y-4">
                  <label className="block text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Video className="w-4 h-4 text-purple-600" />
                    Video Review
                  </label>
                  
                  {/* YouTube URL Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">YouTube URL (Optional)</label>
                    <Input
                      type="url"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={reviewForm.youtubeUrl}
                      onChange={(e) => handleYouTubeUrlChange(e.target.value)}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500">
                      Paste a YouTube video URL to use it as your review video
                    </p>
                    {reviewForm.youtubeUrl && reviewForm.videoUrl && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-xs text-green-700 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          YouTube video loaded successfully
                        </p>
                      </div>
                    )}
                    {reviewForm.youtubeUrl && !reviewForm.videoUrl && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-xs text-yellow-700">
                          Please enter a valid YouTube URL
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Video Preview */}
                  {reviewForm.videoUrl && (
                    <div className="space-y-3">
                      {reviewForm.videoUrl.includes('youtube.com/embed') && (
                        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-gray-900">
                          {!videoPlaying && reviewForm.videoThumbnail ? (
                            <div 
                              className="relative w-full h-full cursor-pointer group"
                              onClick={() => setVideoPlaying(true)}
                            >
                              <Image
                                src={reviewForm.videoThumbnail}
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
                                src={videoPlaying ? `${reviewForm.videoUrl}?autoplay=1` : reviewForm.videoUrl}
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
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleRemoveVideo}
                        className="w-full border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Remove Video
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="bg-white/90 backdrop-blur-sm rounded-lg p-4 border-2 border-blue-200 shadow-lg flex-shrink-0">
              <div className="flex gap-2 w-full">
                <Button 
                  onClick={() => setShowWriteModal(false)}
                  variant="outline"
                  className="flex-1 border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 font-semibold"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmitReview}
                  disabled={submitting || !reviewForm.course}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {submitting ? 'Submitting...' : 'Submit Review'}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Review Modal */}
        <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
          <DialogContent className="sm:max-w-3xl bg-gradient-to-br from-blue-50 via-white to-purple-50 border-2 border-blue-200 shadow-2xl flex flex-col max-h-[min(85dvh,920px)]">
            <DialogHeader className="bg-white/90 backdrop-blur-sm rounded-lg p-4 border border-blue-100 shadow-sm flex-shrink-0">
              <DialogTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Edit className="w-5 h-5 text-blue-600" />
                Edit Review
              </DialogTitle>
              <DialogDescription className="text-sm text-gray-600">
                Update your review for this course.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 p-4 overflow-y-auto flex-1 min-h-0">
              <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 border-2 border-gray-200 shadow-lg">
                <label className="block text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-gray-600" />
                  Course
                </label>
                <div className="w-full h-10 px-3 py-2 border-2 border-gray-300 rounded-lg bg-gray-100 text-gray-600 flex items-center">
                  {courses.find(c => c._id === reviewForm.course)?.title || 'Unknown Course'}
                </div>
                <p className="text-xs text-gray-500 mt-1">Course cannot be changed</p>
              </div>

              <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 border-2 border-purple-200 shadow-lg">
                <label className="block text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-600" />
                  Review Type
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="reviewTypeEdit"
                      value="text"
                      checked={reviewForm.reviewType === 'text'}
                      onChange={(e) => setReviewForm(prev => ({ ...prev, reviewType: e.target.value as 'text' | 'video' }))}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Text Review
                    </span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="reviewTypeEdit"
                      value="video"
                      checked={reviewForm.reviewType === 'video'}
                      onChange={(e) => setReviewForm(prev => ({ ...prev, reviewType: e.target.value as 'text' | 'video' }))}
                      className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Video className="w-4 h-4" />
                      Video Review
                    </span>
                  </label>
                </div>
              </div>

              <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 border-2 border-purple-200 shadow-lg">
                <label className="block text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Star className="w-4 h-4 text-purple-600" />
                  Rating
                </label>
                <div className="flex items-center gap-1">
                  {renderStars(reviewForm.rating, true, (rating) => 
                    setReviewForm(prev => ({ ...prev, rating }))
                  )}
                  <span className="ml-2 text-sm text-gray-600">({reviewForm.rating}/5)</span>
                </div>
              </div>

              <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 border-2 border-gray-200 shadow-lg">
                <AttractiveInput
                  type="text"
                  label="Review Title (Optional)"
                  placeholder="Give your review a title..."
                  value={reviewForm.title}
                  onChange={(e) => setReviewForm(prev => ({ ...prev, title: e.target.value }))}
                  variant="default"
                  colorScheme="primary"
                  size="md"
                />
              </div>

              {reviewForm.reviewType === 'text' && (
                <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 border-2 border-gray-200 shadow-lg">
                  <AttractiveTextarea
                    label="Review Comment"
                    placeholder="Share your thoughts about this course..."
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm(prev => ({ ...prev, comment: e.target.value }))}
                    rows={4}
                    variant="default"
                    colorScheme="primary"
                    size="md"
                  />
                </div>
              )}

              {reviewForm.reviewType === 'video' && (
                <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 border-2 border-purple-200 shadow-lg space-y-4">
                  <label className="block text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Video className="w-4 h-4 text-purple-600" />
                    Video Review
                  </label>
                  
                  {/* YouTube URL Input */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">YouTube URL (Optional)</label>
                    <Input
                      type="url"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={reviewForm.youtubeUrl}
                      onChange={(e) => handleYouTubeUrlChange(e.target.value)}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500">
                      Paste a YouTube video URL to use it as your review video
                    </p>
                    {reviewForm.youtubeUrl && reviewForm.videoUrl && (
                      <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                        <p className="text-xs text-green-700 flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          YouTube video loaded successfully
                        </p>
                      </div>
                    )}
                    {reviewForm.youtubeUrl && !reviewForm.videoUrl && (
                      <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <p className="text-xs text-yellow-700">
                          Please enter a valid YouTube URL
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Video Preview */}
                  {reviewForm.videoUrl && (
                    <div className="space-y-3">
                      {reviewForm.videoUrl.includes('youtube.com/embed') && (
                        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-gray-900">
                          {!videoPlaying && reviewForm.videoThumbnail ? (
                            <div 
                              className="relative w-full h-full cursor-pointer group"
                              onClick={() => setVideoPlaying(true)}
                            >
                              <Image
                                src={reviewForm.videoThumbnail}
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
                                src={videoPlaying ? `${reviewForm.videoUrl}?autoplay=1` : reviewForm.videoUrl}
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
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleRemoveVideo}
                        className="w-full border-red-300 text-red-600 hover:bg-red-50"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Remove Video
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="bg-white/90 backdrop-blur-sm rounded-lg p-4 border-2 border-blue-200 shadow-lg flex-shrink-0">
              <div className="flex gap-2 w-full">
                <Button 
                  onClick={() => setShowEditModal(false)}
                  variant="outline"
                  className="flex-1 border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 font-semibold"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmitReview}
                  disabled={submitting}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {submitting ? 'Updating...' : 'Update Review'}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Review View Modal */}
        <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
          <DialogContent className="sm:max-w-3xl max-h-[min(85dvh,920px)] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                Review Details
              </DialogTitle>
              <DialogDescription>
                View your complete review information
              </DialogDescription>
            </DialogHeader>
            
            {selectedReview && (
              <div className="space-y-6">
                {/* Course Info */}
                <div className="flex items-center gap-4 pb-4 border-b">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {typeof selectedReview.course === 'object' 
                        ? selectedReview.course?.title || 'Unknown Course'
                        : 'Unknown Course'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Your review for this course
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
                      Pending Approval
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
                      Displayed on Course Page
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

                {/* Display Status Info */}
                {(selectedReview.isDisplayed === true) && (
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <div className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-purple-600" />
                      <p className="text-sm font-semibold text-purple-900">
                        This review is displayed on the course details page
                      </p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowReviewModal(false);
                      handleEditReview(selectedReview);
                    }}
                    className="border-blue-500 text-blue-600 hover:bg-blue-50"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit Review
                  </Button>
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
                    Delete Review
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Advanced Filters Drawer */}
        <Sheet open={showFilterDrawer} onOpenChange={setShowFilterDrawer}>
          <SheetContent side="right" className="w-full sm:max-w-md bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border-l-4 border-blue-300 shadow-2xl">
            <SheetHeader className="bg-white/80 backdrop-blur-sm rounded-lg p-4 sm:p-6 border border-blue-100 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex-1">
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-1 flex items-center gap-2">
                    <Settings className="w-5 h-5 text-blue-600" />
                    Advanced Filters
                  </h3>
                  <p className="text-sm text-gray-600">
                    Filter and sort your reviews
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
                  placeholder="Search by title, comment, or course name..."
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
              <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 border-2 border-blue-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-blue-300">
                <label className="block text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-600" />
                  Course
                </label>
                <select
                  value={filters.course}
                  onChange={(e) => handleFilterChange('course', e.target.value)}
                  className="w-full h-10 px-3 py-2 border-2 border-blue-300 hover:border-blue-400 focus:border-blue-500 focus:ring-blue-500/20 focus:shadow-lg focus:shadow-blue-500/10 rounded-lg bg-white text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all duration-200 font-medium text-sm"
                >
                  <option value="all">All Courses</option>
                  {courses.map((course) => (
                    <option key={course._id} value={course._id}>
                      {course.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Rating Filter */}
              <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 border-2 border-purple-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-purple-300">
                <label className="block text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
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

              {/* Sort Options */}
              <div className="bg-white/90 backdrop-blur-sm rounded-lg p-4 border-2 border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-gray-300">
                <label className="block text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
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

            <SheetFooter className="flex flex-col gap-2 bg-white/90 backdrop-blur-sm rounded-lg p-4 sm:p-6 border-2 border-blue-200 shadow-lg">
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
      </main>
    </StudentRoleShell>
  );
}

export default function StudentReviewsPage() {
  return (
    <StudentReviewsPageContent />
  );
}

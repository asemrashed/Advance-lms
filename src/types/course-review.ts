export interface CourseReview {
  _id: string;
  course: string | {
    _id: string;
    title: string;
    thumbnailUrl?: string;
  };
  student: {
    _id: string;
    name: string;
    avatar?: string;
    role?: string;
    isBlockedFromReviews?: boolean;
  };
  displayStudentName?: string;
  rating: number;
  reviewType?: 'text' | 'video';
  title?: string;
  comment?: string;
  videoUrl?: string;
  videoThumbnail?: string;
  isVerified: boolean;
  isPublic: boolean;
  helpfulVotes: number;
  reportedCount: number;
  isApproved: boolean;
  isDisplayed?: boolean; // Whether the review should be displayed on course details page
  displayOrder?: number; // Order in which the review should be displayed (only for displayed reviews)
  instructorReply?: string;
  instructorRepliedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReviewRequest {
  course: string;
  rating: number;
  reviewType?: 'text' | 'video';
  title?: string;
  comment?: string;
  videoUrl?: string;
  videoThumbnail?: string;
}

export interface UpdateReviewRequest {
  rating?: number;
  reviewType?: 'text' | 'video';
  title?: string;
  comment?: string;
  videoUrl?: string;
  videoThumbnail?: string;
}

export interface ReviewFilters {
  course?: string;
  student?: string;
  rating?: number;
  isPublic?: boolean;
  isApproved?: boolean;
  isVerified?: boolean;
}

export interface ReviewSearchParams {
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'rating' | 'helpfulVotes';
  sortOrder?: 'asc' | 'desc';
  rating?: number;
  search?: string;
}

export interface CourseRatingStats {
  totalReviews: number;
  averageRating: number;
  ratingDistribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export interface ReviewResponse {
  reviews: CourseReview[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ReviewVoteRequest {
  reviewId: string;
  isHelpful: boolean;
}

export interface ReviewReportRequest {
  reviewId: string;
  reason: string;
  description?: string;
}

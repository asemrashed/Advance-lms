'use client';

import type { WebsiteContent } from './types';
import { DndContext, closestCenter, DragEndEvent, useSensors, useSensor, PointerSensor, KeyboardSensor } from '@dnd-kit/core';
import { arrayMove, SortableContext, verticalListSortingStrategy, useSortable, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import VideoWatermark from '@/components/VideoWatermark';
import Image from 'next/image';
import { LuPlus as Plus, LuStar as Star, LuSearch as Search, LuLoader as Loader2, LuPlay as Play, LuEye as Eye, LuEyeOff as EyeOff, LuGripVertical, LuX as X, LuMessageSquare as MessageSquare, LuCheck as CheckCircle } from 'react-icons/lu';
import type { SensorDescriptor } from '@dnd-kit/core';
import React from 'react';
import { imageUrlError } from '@/lib/imageUrl';

function getReviewStudentLabel(review: any) {
  const customName = review?.displayStudentName?.trim();
  if (customName) return customName;
  return review?.student?.name || 'Unknown';
}

// Sortable Review Item Component
function SortableReviewItem({ 
  review, 
  onToggleDisplay, 
  onView 
}: { 
  review: any; 
  onToggleDisplay: (reviewId: string, currentStatus: boolean) => void;
  onView: (review: any) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: review._id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border-2 p-4 transition-all ${
        (review.isDisplayed === true)
          ? 'border-green-200 bg-green-50'
          : 'border-gray-200 bg-white hover:border-gray-300'
      } ${isDragging ? 'shadow-lg z-50' : ''}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing flex-shrink-0 pt-1"
        >
          <LuGripVertical className="w-5 h-5 text-gray-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < review.rating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm font-semibold text-gray-700">
              {getReviewStudentLabel(review)}
            </span>
            {review.isApproved && (
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                Approved
              </Badge>
            )}
            {review.isPublic && (
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                Public
              </Badge>
            )}
            {review.reviewType === 'video' && (
              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                <Play className="w-3 h-3 mr-1" />
                Video
              </Badge>
            )}
            {(review.isDisplayed === true) && (
              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                Order: {review.displayOrder || 0}
              </Badge>
            )}
          </div>
          <div className="text-xs text-gray-500 mb-2">
            Course: {typeof review.course === 'object' ? review.course?.title || 'Unknown' : 'Unknown'}
          </div>
          {review.title && (
            <h4 className="text-sm font-semibold text-gray-800 mb-1">{review.title}</h4>
          )}
          {review.comment && (
            <p className="text-sm text-gray-600 line-clamp-2 mb-2">{review.comment}</p>
          )}
          <p className="text-xs text-gray-400">
            {new Date(review.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onView(review)}
            className="border-blue-500 text-blue-600 hover:bg-blue-50"
          >
            <Eye className="w-4 h-4 mr-1" />
            View
          </Button>
          <div className="flex flex-col items-center gap-2">
            <Checkbox
              checked={review.isDisplayed || false}
              onCheckedChange={() => onToggleDisplay(review._id, review.isDisplayed || false)}
              className="h-5 w-5"
            />
            <span className="text-xs text-gray-500 whitespace-nowrap">
              {(review.isDisplayed === true) ? 'Displayed' : 'Hidden'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export type NewReviewForm = {
  course: string;
  rating: number;
  reviewType: 'text' | 'video';
  title: string;
  comment: string;
  videoUrl: string;
  videoThumbnail: string;
  isPublic: boolean;
  isApproved: boolean;
  isDisplayed: boolean;
};

interface ReviewsSectionProps {
  reviews: any[];
  filteredReviews: any[];
  reviewsLoading: boolean;
  reviewSearch: string;
  setReviewSearch: (value: string) => void;
  displayedReviews: any[];
  hiddenReviews: any[];
  sensors: SensorDescriptor<any>[];
  toggleReviewDisplay: (reviewId: string, currentStatus: boolean) => void;
  updateReviewOrder: (reorderedDisplayedReviews: any[]) => void;
  setShowAddReviewModal: (open: boolean) => void;
  showAddReviewModal: boolean;
  showReviewModal: boolean;
  setShowReviewModal: (open: boolean) => void;
  selectedReview: any | null;
  setSelectedReview: (review: any | null) => void;
  creatingReview: boolean;
  handleCreateReview: () => void;
  newReview: NewReviewForm;
  setNewReview: React.Dispatch<React.SetStateAction<NewReviewForm>>;
  reviewCourses: Array<{ _id: string; title: string }>;
  resetNewReviewForm: () => void;
}

export function ReviewsSection(props: ReviewsSectionProps) {
  const {
    reviews, filteredReviews, reviewsLoading, reviewSearch, setReviewSearch,
    displayedReviews, hiddenReviews, sensors,
    toggleReviewDisplay, updateReviewOrder,
    setShowAddReviewModal, showAddReviewModal,
    showReviewModal, setShowReviewModal, selectedReview, setSelectedReview,
    creatingReview, handleCreateReview, newReview, setNewReview,
    reviewCourses, resetNewReviewForm,
  } = props;
  return (
    <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    Reviews Management
                  </CardTitle>
                  <CardDescription>Select which reviews to display on course details pages</CardDescription>
                </CardHeader>
              <CardContent className="space-y-6">

                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search reviews by student name, course, title, or comment..."
                      value={reviewSearch}
                      onChange={(e) => setReviewSearch(e.target.value)}
                      className="pl-10 pr-10"
                    />
                    {reviewSearch && (
                      <button
                        onClick={() => setReviewSearch('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Reviews List */}
                  {reviewsLoading ? (
                    <div className="text-center py-12">
                      <Loader2 className="w-8 h-8 mx-auto mb-4 text-gray-400 animate-spin" />
                      <p className="text-gray-500">Loading reviews...</p>
                    </div>
                  ) : filteredReviews.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium mb-2">
                        {reviewSearch ? 'No reviews found matching your search.' : 'No reviews found.'}
                      </p>
                      {!reviewSearch && (
                        <p className="text-sm">Reviews will appear here once students submit them.</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="text-sm text-gray-600 mb-4">
                        Showing {filteredReviews.length} of {reviews.length} reviews
                      </div>
                  
                      {/* Displayed Reviews - Draggable */}
                      {displayedReviews.length > 0 && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                              <Star className="w-4 h-4 text-yellow-500" />
                              Displayed Reviews ({displayedReviews.length})
                            </h3>
                            <p className="text-xs text-gray-500">Drag and drop to reorder</p>
                          </div>
                          <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={(event) => {
                              const { active, over } = event;
                              if (over && active.id !== over.id) {
                                const oldIndex = displayedReviews.findIndex(r => r._id === active.id);
                                const newIndex = displayedReviews.findIndex(r => r._id === over.id);
                            
                                if (oldIndex !== -1 && newIndex !== -1) {
                                  const reorderedDisplayed = arrayMove(displayedReviews, oldIndex, newIndex);
                                  const updatedDisplayed = reorderedDisplayed.map((review, index) => ({
                                    ...review,
                                    displayOrder: index + 1
                                  }));
                              
                                  updateReviewOrder(updatedDisplayed);
                                }
                              }
                            }}
                          >
                            <SortableContext
                              items={displayedReviews.map(r => r._id)}
                              strategy={verticalListSortingStrategy}
                            >
                              <div className="space-y-3">
                                {displayedReviews.map((review) => (
                                  <SortableReviewItem
                                    key={review._id}
                                    review={review}
                                    onToggleDisplay={toggleReviewDisplay}
                                    onView={(review) => {
                                      setSelectedReview(review);
                                      setShowReviewModal(true);
                                    }}
                                  />
                                ))}
                              </div>
                            </SortableContext>
                          </DndContext>
                        </div>
                      )}

                      {/* Hidden Reviews - Not Draggable */}
                      {hiddenReviews.length > 0 && (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between pt-4 border-t">
                            <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                              <EyeOff className="w-4 h-4 text-gray-400" />
                              Hidden Reviews ({hiddenReviews.length})
                            </h3>
                          </div>
                          <div className="space-y-3">
                            {hiddenReviews.map((review) => (
                              <div
                                key={review._id}
                                className="rounded-lg border-2 p-4 transition-all border-gray-200 bg-white hover:border-gray-300"
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                                      <div className="flex items-center gap-1">
                                        {[...Array(5)].map((_, i) => (
                                          <Star
                                            key={i}
                                            className={`w-4 h-4 ${
                                              i < review.rating
                                                ? 'fill-yellow-400 text-yellow-400'
                                                : 'text-gray-300'
                                            }`}
                                          />
                                        ))}
                                      </div>
                                      <span className="text-sm font-semibold text-gray-700">
                                        {getReviewStudentLabel(review)}
                                      </span>
                                      {review.isApproved && (
                                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                          Approved
                                        </Badge>
                                      )}
                                      {review.isPublic && (
                                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                                          Public
                                        </Badge>
                                      )}
                                      {review.reviewType === 'video' && (
                                        <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                                          <Play className="w-3 h-3 mr-1" />
                                          Video
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-500 mb-2">
                                      Course: {typeof review.course === 'object' ? review.course?.title || 'Unknown' : 'Unknown'}
                                    </div>
                                    {review.title && (
                                      <h4 className="text-sm font-semibold text-gray-800 mb-1">{review.title}</h4>
                                    )}
                                    {review.comment && (
                                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">{review.comment}</p>
                                    )}
                                    <p className="text-xs text-gray-400">
                                      {new Date(review.createdAt).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <div className="flex flex-col items-end gap-3">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedReview(review);
                                        setShowReviewModal(true);
                                      }}
                                      className="border-blue-500 text-blue-600 hover:bg-blue-50"
                                    >
                                      <Eye className="w-4 h-4 mr-1" />
                                      View
                                    </Button>
                                    <div className="flex flex-col items-center gap-2">
                                      <Checkbox
                                        checked={review.isDisplayed || false}
                                        onCheckedChange={() => toggleReviewDisplay(review._id, review.isDisplayed || false)}
                                        className="h-5 w-5"
                                      />
                                      <span className="text-xs text-gray-500 whitespace-nowrap">
                                        Hidden
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

            {/* Add Review Modal */}
            <Dialog
              open={showAddReviewModal}
              onOpenChange={(open) => {
                setShowAddReviewModal(open);
                if (!open) resetNewReviewForm();
              }}
            >
              <DialogContent className="sm:max-w-2xl max-h-[min(85dvh,920px)] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Plus className="w-5 h-5 text-emerald-600" />
                    Add Review
                  </DialogTitle>
                  <DialogDescription>
                    Create a review as admin. Student name is optional.
                  </DialogDescription>
                </DialogHeader>
    
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Course</label>
                      <select
                        value={newReview.course}
                        onChange={(e) => setNewReview((prev) => ({ ...prev, course: e.target.value }))}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2CBF]/20 focus:border-[#7B2CBF]"
                      >
                        <option value="">Select course</option>
                        {reviewCourses.map((course) => (
                          <option key={course._id} value={course._id}>
                            {course.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
    
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Rating</label>
                      <select
                        value={newReview.rating}
                        onChange={(e) => setNewReview((prev) => ({ ...prev, rating: Number(e.target.value) }))}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2CBF]/20 focus:border-[#7B2CBF]"
                      >
                        {[5, 4, 3, 2, 1].map((rating) => (
                          <option key={rating} value={rating}>
                            {rating} Star
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Review Type</label>
                      <select
                        value={newReview.reviewType}
                        onChange={(e) =>
                          setNewReview((prev) => ({
                            ...prev,
                            reviewType: e.target.value as 'text' | 'video',
                          }))
                        }
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2CBF]/20 focus:border-[#7B2CBF]"
                      >
                        <option value="text">Text</option>
                        <option value="video">Video</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Title</label>
                      <Input
                        value={newReview.title}
                        onChange={(e) => setNewReview((prev) => ({ ...prev, title: e.target.value }))}
                        placeholder="Optional title"
                      />
                    </div>
                  </div>
    
                  {newReview.reviewType === 'text' ? (
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-1 block">Comment</label>
                      <textarea
                        value={newReview.comment}
                        onChange={(e) => setNewReview((prev) => ({ ...prev, comment: e.target.value }))}
                        rows={4}
                        placeholder="Write review comment"
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B2CBF]/20 focus:border-[#7B2CBF]"
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">Video URL</label>
                        <Input
                          value={newReview.videoUrl}
                          onChange={(e) => setNewReview((prev) => ({ ...prev, videoUrl: e.target.value }))}
                          placeholder="https://..."
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-1 block">Video Thumbnail URL</label>
                        <Input
                          value={newReview.videoThumbnail}
                          onChange={(e) => setNewReview((prev) => ({ ...prev, videoThumbnail: e.target.value }))}
                          placeholder="https://..."
                          aria-invalid={Boolean(imageUrlError(newReview.videoThumbnail))}
                        />
                        <p className="mt-1 text-xs text-muted-foreground">Only HTTPS links are allowed.</p>
                        {imageUrlError(newReview.videoThumbnail) ? (
                          <p className="mt-1 text-xs text-destructive" role="alert">
                            {imageUrlError(newReview.videoThumbnail)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  )}
    
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <Checkbox
                        checked={newReview.isPublic}
                        onCheckedChange={(checked) =>
                          setNewReview((prev) => ({ ...prev, isPublic: Boolean(checked) }))
                        }
                      />
                      Public
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <Checkbox
                        checked={newReview.isApproved}
                        onCheckedChange={(checked) =>
                          setNewReview((prev) => ({ ...prev, isApproved: Boolean(checked) }))
                        }
                      />
                      Approved
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <Checkbox
                        checked={newReview.isDisplayed}
                        onCheckedChange={(checked) =>
                          setNewReview((prev) => ({ ...prev, isDisplayed: Boolean(checked) }))
                        }
                      />
                      Display on website
                    </label>
                  </div>
    
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowAddReviewModal(false);
                        resetNewReviewForm();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateReview}
                      disabled={creatingReview}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      {creatingReview ? 'Adding...' : 'Add Review'}
                    </Button>
                  </div>
                </div>
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
                    View complete review information
                  </DialogDescription>
                </DialogHeader>
                
                {selectedReview && (
                  <div className="space-y-6">
                    {/* Student Info */}
                    <div className="flex items-center gap-4 pb-4 border-b">
                      {selectedReview.student?.avatar && (
                        <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-gray-200">
                          <Image
                            src={selectedReview.student.avatar}
                            alt={getReviewStudentLabel(selectedReview)}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        </div>
                      )}
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {getReviewStudentLabel(selectedReview)}
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
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Approved
                        </Badge>
                      )}
                      {selectedReview.isPublic && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          Public
                        </Badge>
                      )}
                      {selectedReview.isDisplayed && (
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
    
                    {/* Video Review */}
                    {selectedReview.reviewType === 'video' && selectedReview.videoUrl && (
                      <div>
                        <h4 className="text-base font-semibold text-gray-900 mb-2">Video Review</h4>
                        {selectedReview.videoThumbnail && (
                          <div className="mb-3">
                            <h5 className="text-sm font-semibold text-gray-700 mb-1">Video Thumbnail URL</h5>
                            <a
                              href={selectedReview.videoThumbnail}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:text-blue-800 underline break-all"
                            >
                              {selectedReview.videoThumbnail}
                            </a>
                          </div>
                        )}
                        <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-gray-900">
                          <video
                            src={selectedReview.videoUrl}
                            controls
                            className="h-full w-full object-contain"
                            preload="metadata"
                            playsInline
                            poster={selectedReview.videoThumbnail}
                          >
                            Your browser does not support the video tag.
                          </video>
                          <VideoWatermark />
                        </div>
                        {selectedReview.comment && (
                          <div className="mt-3">
                            <h5 className="text-sm font-semibold text-gray-700 mb-1">Additional Comment</h5>
                            <p className="text-gray-600 whitespace-pre-wrap text-sm">
                              {selectedReview.comment}
                            </p>
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
                          // Update the selected review state
                          setSelectedReview({
                            ...selectedReview,
                            isDisplayed: !(selectedReview.isDisplayed || false)
                          });
                        }}
                        className="h-5 w-5"
                      />
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
    </>
  );
}

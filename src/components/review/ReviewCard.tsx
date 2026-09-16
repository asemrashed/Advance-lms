"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { CourseReview } from "@/types/course-review";
import {
  LuStar as Star,
  LuEye as Eye,
  LuEyeOff as EyeOff,
  LuCheck as Check,
  LuFlag as Flag,
  LuUser as User,
  LuBookOpen as BookOpen,
  LuCalendar as Calendar,
  LuThumbsUp as ThumbsUp,
  LuBan as Ban,
  LuEllipsisVertical as MoreVertical,
} from "react-icons/lu";

export interface ReviewCardAction {
  id: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  className?: string;
  /** Solid approve-style button on desktop */
  prominent?: boolean;
}

export interface ReviewCardProps {
  review: CourseReview;
  variant?: "student" | "admin" | "instructor";
  /** When set, shows reviewer row (admin / instructor). Omit for student own list. */
  studentDisplayLabel?: string;
  actions: ReviewCardAction[];
}

function renderStars(rating: number) {
  return Array.from({ length: 5 }, (_, i) => (
    <Star
      key={i}
      className={cn(
        "w-4 h-4 shrink-0",
        i < rating ? "text-yellow-400 fill-current" : "text-gray-300",
      )}
    />
  ));
}

function courseTitle(review: CourseReview) {
  if (typeof review.course === "string") return "Course";
  return review.course.title ?? "Course";
}

export function ReviewCard({
  review,
  variant = "student",
  studentDisplayLabel,
  actions,
}: ReviewCardProps) {
  const showStudent = Boolean(studentDisplayLabel?.trim());
  const studentObj =
    typeof review.student === "object" && review.student ? review.student : null;
  const isBlocked = Boolean(studentObj?.isBlockedFromReviews);

  const publicBadgeClass =
    variant === "admin" && review.isPublic
      ? "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white bg-[#7B2CBF]"
      : review.isPublic
        ? "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
        : "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800";

  return (
    <div className="bg-white rounded-lg p-3 sm:p-4 shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0 flex-1 flex flex-wrap items-center gap-x-2 gap-y-2">
          <div className="flex items-center shrink-0">{renderStars(review.rating)}</div>
          <span className="text-sm text-gray-500 shrink-0">({review.rating}/5)</span>
          <div className="flex flex-wrap items-center gap-2">
            {review.isApproved ? (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                <Check className="w-3 h-3 mr-1 shrink-0" />
                Approved
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                <Eye className="w-3 h-3 mr-1 shrink-0" />
                Pending
              </span>
            )}
            {review.isPublic ? (
              <span className={publicBadgeClass}>
                <Eye className="w-3 h-3 mr-1 shrink-0" />
                Public
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                <EyeOff className="w-3 h-3 mr-1 shrink-0" />
                Private
              </span>
            )}
            {review.reportedCount > 0 && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                <Flag className="w-3 h-3 mr-1 shrink-0" />
                Reported ({review.reportedCount})
              </span>
            )}
          </div>
        </div>

        {actions.length > 0 ? (
          <div className="flex shrink-0 items-start justify-end">
            <div className="hidden lg:flex flex-wrap items-center justify-end gap-2 max-w-[min(100%,42rem)]">
              {actions.map((a) => (
                <Button
                  key={a.id}
                  size="sm"
                  variant={a.prominent ? "default" : "outline"}
                  onClick={a.onClick}
                  className={cn(
                    a.prominent && "bg-green-600 hover:bg-green-700 text-white border-0 shadow-sm",
                    a.className,
                  )}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {a.icon}
                    {a.label}
                  </span>
                </Button>
              ))}
            </div>

            <div className="lg:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-9 w-9 p-0"
                    aria-label="Review actions"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 z-50">
                  {actions.map((a) => (
                    <DropdownMenuItem
                      key={a.id}
                      onSelect={() => {
                        a.onClick();
                      }}
                      className={cn(
                        "gap-2 cursor-pointer",
                        a.id === "delete" && "text-red-600 focus:text-red-600",
                      )}
                    >
                      <span className="flex items-center gap-2">
                        {a.icon}
                        {a.label}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ) : null}
      </div>

      {review.title ? (
        <h4 className="font-semibold text-gray-900 mb-2 break-words">{review.title}</h4>
      ) : null}
      {review.comment ? (
        <p className="text-gray-700 mb-3 text-sm sm:text-base break-words">{review.comment}</p>
      ) : null}

      <div className="flex flex-col sm:flex-row sm:flex-wrap gap-x-4 gap-y-2 text-sm text-gray-500">
        {showStudent ? (
          <div className="flex items-center gap-1 min-w-0">
            <User className="w-4 h-4 shrink-0" />
            <span className="truncate">{studentDisplayLabel}</span>
            {isBlocked ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 shrink-0">
                <Ban className="w-3 h-3 mr-1" />
                Blocked
              </span>
            ) : null}
          </div>
        ) : null}
        <div className="flex items-center gap-1 min-w-0">
          <BookOpen className="w-4 h-4 shrink-0" />
          <span className="truncate">{courseTitle(review)}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Calendar className="w-4 h-4" />
          <span>{new Date(review.createdAt).toLocaleDateString()}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <ThumbsUp className="w-4 h-4" />
          <span>{review.helpfulVotes} helpful</span>
        </div>
      </div>
    </div>
  );
}

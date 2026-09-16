import Image from "next/image";
import Link from "next/link";
import { LuShoppingCart as ShoppingCart } from 'react-icons/lu';

interface CourseCardProps {
  course: {
    id: number;
    image: string;
    courseType?: 'live' | 'recorded';
    level: string;
    levelColor: string;
    category: string;
    categoryColor: string;
    rating: string;
    title: string;
    lectures: number;
    hours: number;
    instructor: {
      name: string;
      avatar: string;
    };
    price: number;
    monthlyPrice?: number;
    originalPrice: number | null;
    courseId?: string;
  };
  isEnrolled?: boolean;
  index?: number;
  isLoaded?: boolean;
  animationDelay?: string;
  className?: string;
}

export default function CourseCard({
  course,
  isEnrolled = false,
  index = 0,
  isLoaded = true,
  animationDelay,
  className = "",
}: CourseCardProps) {
  const delay = animationDelay || `${0.1 * index}s`;
  const showMonthly = course.courseType === 'live' && typeof course.monthlyPrice === 'number' && course.monthlyPrice > 0;
  const effectivePrice = showMonthly ? (course.monthlyPrice as number) : course.price;

  const hasDiscount =
    !showMonthly &&
    Boolean(course.originalPrice && course.originalPrice > effectivePrice);
  const discountPercent = hasDiscount
    ? Math.round(
        (((course.originalPrice as number) - effectivePrice) /
          (course.originalPrice as number)) *
          100,
      )
    : 0;

  return (
    <Link
      href={(course as any).courseId ? `/course/${(course as any).courseId}` : "/course-details"}
      className={`${
        isLoaded ? "animate-fade-in-up" : "animate-on-load"
      } group flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-lg transition-all hover:shadow-xl ${className}`}
      style={{ animationDelay: delay }}
    >
      {/* Course Image — 16:9 matches course creation thumbnail guidance */}
      <div className="relative aspect-video w-full overflow-hidden p-4">
        <div className="relative h-full w-full overflow-hidden rounded-2xl">
          <Image
            src={course.image}
            alt={course.title}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        </div>
      </div>

      {/* Course Content */}
      <div className="flex flex-1 flex-col p-5">
        {/* Rating with 5 Stars and Review Amount - Attractive Design */}
        <div className="mb-4 inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-yellow-50 via-amber-50 to-yellow-50 px-4 py-2.5 shadow-sm border border-yellow-100/50">
          {/* 5 Stars with gradient */}
          <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
              <svg
                key={i}
                width="18"
                height="18"
                viewBox="0 0 20 20"
                fill="none"
                className="text-yellow-400 drop-shadow-sm transition-transform duration-200 hover:scale-110"
                style={{
                  filter: 'drop-shadow(0 1px 2px rgba(251, 191, 36, 0.3))',
                }}
              >
                <path
                  d="M10 1L12.5 7.5L19 8.5L14 13L15.5 19.5L10 16L4.5 19.5L6 13L1 8.5L7.5 7.5L10 1Z"
                  fill="currentColor"
                />
              </svg>
            ))}
          </div>
          {/* Review Amount with icon */}
          <div className="flex items-center gap-1.5">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              className="text-amber-600"
            >
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
                fill="currentColor"
              />
            </svg>
            <span className="text-sm font-bold text-gray-800">
              {course.rating}
            </span>
            <span className="text-xs font-medium text-gray-600">
              reviews
            </span>
          </div>
        </div>

        {/* Course Title */}
        <h3 className="mb-4 line-clamp-2 text-lg font-bold leading-tight text-gray-800">
          {course.title}
        </h3>

        {isEnrolled ? (
          <div className="mt-auto border-t border-gray-100 pt-4">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const courseId = (course as any).courseId;
                if (!courseId) return;
                window.location.href = `/student/courses`;
              }}
              className="h-11 w-full rounded-xl border-2 border-[#10B981] bg-white px-6 font-bold text-[#10B981] transition-all duration-300 hover:bg-[#10B981] hover:text-white"
            >
              কোর্স শুরু করুন
            </button>
          </div>
        ) : (
          /* Price and Buy Now Button Row */
          <div className="mt-auto border-t border-gray-100 pt-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-2xl font-extrabold leading-none text-[#0B9E74]">
                ৳{effectivePrice}
                {showMonthly ? <span className="text-xs font-semibold text-[#0B9E74]">/mo</span> : null}
              </span>
              {!showMonthly && course.originalPrice && (
                <span className="text-sm font-medium text-gray-400 line-through">
                  ৳{course.originalPrice}
                </span>
              )}
              {hasDiscount && (
                <span className="rounded-md bg-[#10B981]/15 px-2 py-0.5 text-xs font-bold text-[#059669]">
                  -{discountPercent}%
                </span>
              )}
            </div>

            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Handle buy now action - you can add your purchase logic here
                const courseId = (course as any).courseId || course.id;
                window.location.href = `/course/${courseId}?action=buy`;
              }}
              className="group/btn h-11 w-full rounded-md px-6 text-sm font-bold text-white transition-all duration-300"
              style={{
                fontFamily: "var(--font-bengali), sans-serif",
                background: "linear-gradient(135deg, #10B981 0%, #059669 50%, #047857 100%)",
                boxShadow: "0 8px 20px rgba(16, 185, 129, 0.35)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "linear-gradient(135deg, #059669 0%, #047857 50%, #065F46 100%)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "linear-gradient(135deg, #10B981 0%, #059669 50%, #047857 100%)";
              }}
            >
              <span className="inline-flex items-center justify-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                <span>কোর্সটি কিনুন</span>
              </span>
            </button>
          </div>
        )}
      </div>
    </Link>
  );
}

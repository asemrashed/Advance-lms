'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';
import { resolveImageSrc } from '@/lib/resolveImageSrc';
import Image from 'next/image';
import Link from 'next/link';
import PrimaryActionBtn from './ui/buttons/PrimaryActionBtn';
import { useRouter } from 'next/navigation';

function splitPriceDisplay(price: unknown): { amount: string; suffix: string } {
  const text = String(price ?? '');
  if (text.endsWith('/mo')) {
    return { amount: text.slice(0, -3), suffix: '/mo' };
  }
  return { amount: text, suffix: '' };
}

export default function CourseCard({
  course,
  index,
  list = false,
}: {
  course: any;
  index: number;
  list?: boolean;
}) {
  const router = useRouter();
  const [imageError, setImageError] = useState(false);
  const imageSrc =
    typeof course?.image === "string" ? resolveImageSrc(course.image) : "";
  const showImage = Boolean(imageSrc) && !imageError;
  const actionLabel =
    typeof course?.actionLabel === "string" && course.actionLabel.trim()
      ? course.actionLabel.trim()
      : "Enroll Course";
  const isFree =
    course?.isFree === true ||
    course?.price === "Free" ||
    course?.price === 0;
  const { amount: priceAmount, suffix: priceSuffix } = splitPriceDisplay(course?.price);

  const rawHref = typeof course?.href === "string" ? course.href : "";
  const targetHref =
    rawHref.startsWith("/course/") ||
    rawHref.startsWith("/courses") ||
    rawHref.startsWith("/enroll")
      ? rawHref
      : rawHref.startsWith("/")
        ? `/course${rawHref}`
        : rawHref
          ? `/course/${rawHref}`
          : "/courses";

  return (
    <Link
      href={targetHref}
      key={index}
      className={cn(
        "group flex h-full w-full overflow-hidden rounded-lg bg-surface-container shadow-md transition-all duration-300 hover:shadow-lg hover:shadow-primary/40",
        list
          ? "flex-row items-center gap-3 p-3 sm:gap-4 sm:p-4 md:gap-6"
          : "flex-col justify-between"
      )}
    >
      {/* Image — 16:9, edge-to-edge on stacked cards so it stays large on mobile */}
      <div
        className={cn(
          "relative shrink-0 overflow-hidden",
          list
            ? "aspect-video w-36 rounded-lg sm:w-42 md:w-68"
            : "aspect-[4/3] w-full sm:aspect-video"
        )}
      >
        {showImage ? (
          <Image
            src={imageSrc}
            alt={course.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes={
              list
                ? "(max-width: 768px) 40vw, 272px"
                : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            }
            unoptimized
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 text-sm font-medium text-white/70">
            {course.imageFallback || "Course"}
          </div>
        )}
        <span
          className={cn(
            "absolute left-2 top-2 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-tighter sm:left-3 sm:top-3 md:left-4 md:top-4 md:px-3 md:py-1.5 md:text-xs",
            course.badgeClass,
          )}
        >
          {course.badge}
        </span>
      </div>

      <div
        className={cn(
          "flex min-w-0 flex-1 flex-col",
          list ? "gap-2" : "gap-2 p-3 sm:gap-2.5 sm:p-4"
        )}
      >
        <h3 className="line-clamp-2 text-sm font-extrabold leading-snug text-foreground sm:text-base md:text-lg lg:text-xl">
          {course.title}
        </h3>

        <div
          className={cn(
            "mt-auto flex justify-between border-t border-outline-variant/20 pt-2",
            list
              ? "flex-col items-start gap-2"
              : "flex-row items-end gap-2"
          )}
        >
          <span className="inline-flex min-w-0 flex-wrap items-baseline gap-0.5 text-primary">
            {!isFree && (
              <span className="text-sm font-black leading-none sm:text-base md:text-lg">
                ৳
              </span>
            )}
            <span className="text-base font-black leading-none sm:text-lg md:text-xl lg:text-2xl">
              {isFree ? "Free" : priceAmount}
            </span>
            {priceSuffix ? (
              <span className="shrink-0 text-[11px] font-semibold leading-none text-primary/80 sm:text-xs">
                {priceSuffix}
              </span>
            ) : null}
          </span>
          <span className="flex min-w-0 items-center gap-1 text-[11px] font-semibold text-muted-foreground sm:gap-1.5 sm:text-sm">
            <span className="material-symbols-outlined text-[14px] sm:text-base">
              play_lesson
            </span>
            <span className="truncate">{course.lessons}</span>
          </span>
        </div>

        <div className={cn("mt-1 sm:mt-2", list ? "w-fit px-2" : "w-full")}>
          <PrimaryActionBtn
            handleBtn={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.preventDefault();
              router.push(targetHref);
            }}
            value={actionLabel}
            size="lg"
          />
        </div>
      </div>
    </Link>
  );
}

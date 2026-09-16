"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import {
  LuBookOpen,
  LuUsers,
  LuStar,
  LuLinkedin,
  LuTwitter,
  LuGlobe,
  LuChartBar,
  LuCirclePlay,
  LuLayers,
  LuLanguages,
  LuCircleCheck,
  LuLock,
  LuChevronDown,
  LuChevronUp,
  LuX,
  LuVideo,
  LuFileText,
  LuClipboardList,
  LuFileCheck2,
  LuPaperclip,
} from "react-icons/lu";
import VideoPlayerModal from "@/components/VideoPlayerModal";
import {
  addToCart,
  fetchCourseBundle,
  useAppDispatch,
  useAppSelector,
} from "@/store";
import { getMyEnrollments } from "@/lib/api/enrollmentClient";
import Image from "next/image";
import CourseFAQ from "./CourseFAQ";
import CourseCard from "@/components/CourseCard";
import { mapPublicCourseRowToCard } from "@/lib/publicCourseCard";
import { RichHtml } from "@/components/ui/MathText";
import type { PublicCourseRow } from "@/types/public-course";
import PrimaryActionBtn from "@/components/ui/buttons/PrimaryActionBtn";
import PrimaryOutLineBtn from "@/components/ui/buttons/PrimaryOutLineBtn";
import { useCheckout } from "@/hooks/useCheckout";
import { CourseDetailSkeleton } from "@/components/skeletons/CourseDetailSkeleton";
import { FadeIn } from "@/components/ui/fade-in";
import { isAdminAreaRole } from "@/lib/roles";
import {
  LiveBatchesSection,
  LiveCourseEnrollSidebar,
} from "@/components/enroll/LiveCourseEnrollParts";
import { CourseEnrollFeatures } from "@/components/courses/CourseEnrollFeatures";
import { CashPaymentModal } from "@/components/payments/CashPaymentModal";
import { formatGradeLabel } from "@/lib/courseLabel";
import { resolveImageSrc } from "@/lib/resolveImageSrc";
import {
  enrollmentButtonLabel,
  isCourseFree,
  resolveRecordedEnrollmentState,
  type EnrollmentUiState,
} from "@/lib/enrollment/enrollmentUiState";

const NAV_SECTIONS = ["about", "instructor", "curriculum", "faq"];
const LIVE_NAV_SECTIONS = ["about", "instructor", "curriculum", "batches", "faq"];

export function CourseDetailClient({
  courseId,
  liveEnroll = false,
}: {
  courseId: string;
  liveEnroll?: boolean;
}) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { handleCheckout, isPending } = useCheckout();
  const { status, error, course, chapters, lessons, faqs, courseId: loadedCourseId } =
    useAppSelector((s) => s.courseDetail);
  const { isAuthenticated, user: authUser } = useAppSelector((s) => s.auth);
  
  const [activeSection, setActiveSection] = useState<string>("about");
  const [expandedChapters, setExpandedChapters] = useState<Record<string, boolean>>({});
  const [expandedLessonId, setExpandedLessonId] = useState<string>("");
  const [activeModal, setActiveModal] = useState<"login" | "enroll" | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<any | null>(null);
  const [previewLesson, setPreviewLesson] = useState<any | null>(null);
  const [enrollmentState, setEnrollmentState] = useState<EnrollmentUiState>("none");
  const [showCashEnroll, setShowCashEnroll] = useState(false);
  const [cashEnrollDone, setCashEnrollDone] = useState(false);
  const [recommendedCourses, setRecommendedCourses] = useState<PublicCourseRow[]>([]);

  const navSections = liveEnroll ? LIVE_NAV_SECTIONS : NAV_SECTIONS;

  const instructor = useMemo(() => {
    if (!course) return null;
    if (course.instructor?._id) return course.instructor;
    const fallback = course.createdBy;
    if (!fallback?._id) return null;
    return {
      _id: fallback._id,
      name: fallback.name,
      role: fallback.role,
      email: fallback.email,
    };
  }, [course]);

  useEffect(() => {
    if (status === "idle" || loadedCourseId !== courseId) {
      dispatch(fetchCourseBundle(courseId));
    }
  }, [dispatch, courseId, status, loadedCourseId]);

  const lessonsByChapter = useMemo(() => {
    const map = new Map<string, typeof lessons>();
    const chapterIdOf = (lesson: (typeof lessons)[number]) => {
      const raw = lesson.chapter;
      if (raw && typeof raw === "object") {
        return String((raw as { _id?: unknown })._id || "");
      }
      return String(raw || "");
    };
    for (const ch of chapters) {
      map.set(
        ch._id,
        lessons
          .filter((l) => chapterIdOf(l) === ch._id)
          .sort((a, b) => a.order - b.order),
      );
    }
    return map;
  }, [chapters, lessons]);

  // Blank chapters (no lessons) stay hidden until the instructor adds content.
  const visibleChapters = useMemo(
    () =>
      chapters.filter(
        (chapter) => (lessonsByChapter.get(chapter._id)?.length ?? 0) > 0,
      ),
    [chapters, lessonsByChapter],
  );

  useEffect(() => {
    if (visibleChapters.length === 0) return;
    if (liveEnroll) {
      setExpandedChapters(
        Object.fromEntries(visibleChapters.map((ch) => [ch._id, true])),
      );
      return;
    }
    setExpandedChapters({ [visibleChapters[0]._id]: true });
  }, [visibleChapters, liveEnroll]);

  const isEnrolled = enrollmentState === "enrolled";

  const ownerInstructorId = useMemo(() => {
    const fromInstructor =
      instructor && typeof instructor === "object" && "_id" in instructor
        ? String((instructor as { _id?: unknown })._id || "")
        : "";
    const fromCourseInstructor =
      course?.instructor && typeof course.instructor === "object"
        ? String((course.instructor as { _id?: unknown })._id || "")
        : String(course?.instructor || "");
    const fromCreatedBy =
      course?.createdBy && typeof course.createdBy === "object"
        ? String((course.createdBy as { _id?: unknown })._id || "")
        : String(course?.createdBy || "");
    return fromInstructor || fromCourseInstructor || fromCreatedBy;
  }, [course, instructor]);

  const canSeeStudentCount =
    isAdminAreaRole(authUser?.role) ||
    (authUser?.role === "instructor" &&
      Boolean(authUser?.id) &&
      Boolean(ownerInstructorId) &&
      String(authUser.id) === ownerInstructorId);

  useEffect(() => {
    if (isAuthenticated && authUser?.role === "student") {
      getMyEnrollments()
        .then((res) => {
          setEnrollmentState(
            resolveRecordedEnrollmentState(res.data.enrollments, courseId),
          );
        })
        .catch((err) => {
          console.error("Error fetching enrollments:", err);
          setEnrollmentState("none");
        });
    } else if (isAuthenticated && (isAdminAreaRole(authUser?.role) || authUser?.role === "instructor")) {
      setEnrollmentState("enrolled");
    } else {
      setEnrollmentState("none");
    }
  }, [isAuthenticated, authUser, courseId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/public/courses/${courseId}/recommended?limit=4`,
          { cache: "no-store" },
        );
        const json = await res.json();
        if (cancelled) return;
        if (json.success && Array.isArray(json.data?.courses)) {
          setRecommendedCourses(json.data.courses);
        } else {
          setRecommendedCourses([]);
        }
      } catch {
        if (!cancelled) setRecommendedCourses([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const recommendedHrefPrefix = liveEnroll ? "/enroll/course" : "/course";

  const toggleChapter = (chapterId: string) => {
    setExpandedChapters((prev) => ({
      ...prev,
      [chapterId]: !prev[chapterId],
    }));
  };

  const getChapterDuration = (chId: string) => {
    const chLessons = lessonsByChapter.get(chId) ?? [];
    const totalMin = chLessons.reduce((sum, l) => sum + (l.duration || l.videoDuration || 0), 0);
    if (totalMin === 0) return "";
    const hours = Math.floor(totalMin / 60);
    const mins = Math.round(totalMin % 60);
    if (hours === 0) return `${mins}m`;
    return `${hours}h ${mins}m`;
  };

  const formatLessonDuration = (min?: number) => {
    if (!min) return "00:00";
    const mins = Math.floor(min);
    const secs = Math.round((min - mins) * 60);
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const openPublicVideoPreview = (lesson: any) => {
    if (!lesson?.isFree) return;
    if (!(lesson.youtubeVideoId || lesson.videoUrl)) return;
    setPreviewLesson(lesson);
  };

  const handleLessonClick = (lesson: any) => {
    if (lesson.isFree) {
      openPublicVideoPreview(lesson);
      return;
    }
    if (!isAuthenticated) {
      setSelectedLesson(lesson);
      setActiveModal("login");
      return;
    }
    if (!isEnrolled) {
      setSelectedLesson(lesson);
      setActiveModal("enroll");
      return;
    }
    router.push(`/student/courses`);
  };

  useEffect(() => {
    const handleScroll = () => {
      // Find which section is currently active
      // Using an offset for sticky headers (approx 160px)
      const scrollPosition = window.scrollY + 170;

      let currentSection = navSections[0] ?? "about";
      for (const sectionId of navSections) {
        const el = document.getElementById(sectionId);
        if (el) {
          const top = el.offsetTop;
          if (scrollPosition >= top) {
            currentSection = sectionId;
          }
        }
      }
      setActiveSection(currentSection);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    // Run initially
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [navSections]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleAddToCart = () => {
    if (!course) return;
    dispatch(
      addToCart({
        courseId: course._id,
        title: course.title,
        finalPrice: course.finalPrice,
        isPaid: course.isPaid,
      }),
    );
    // router.push("/cart");
  };

  const handleCourseEnroll = () => {
    if (!course) return;
    handleCheckout({
      courseId: course._id,
      isPaid: Boolean(course.isPaid),
      finalPrice: course.finalPrice ?? 0,
    });
  };

  if ((status === "loading" || status === "idle") && !course) {
    return <CourseDetailSkeleton liveEnroll={liveEnroll} />;
  }

  if (status === "failed") {
    return (
      <div
        className="rounded-xl border border-destructive/40 bg-error-container/40 p-8 text-on-error-container"
        role="alert"
      >
        <p className="font-semibold">Could not load this course</p>
        <p className="mt-2 text-sm">{error}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary"
            onClick={() => dispatch(fetchCourseBundle(courseId))}
          >
            Retry
          </button>
          <Link
            href={liveEnroll ? "/enroll" : "/courses"}
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground"
          >
            {liveEnroll ? "Back to live courses" : "Back to catalog"}
          </Link>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div
        className="rounded-xl border border-border bg-card p-8"
        role="status"
        aria-live="polite"
      >
        <p className="font-semibold text-foreground">Course not found.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          This course may be unavailable right now.
        </p>
        <Link
          href={liveEnroll ? "/enroll" : "/courses"}
          className="mt-6 inline-block rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground"
        >
          {liveEnroll ? "Back to live courses" : "Back to catalog"}
        </Link>
      </div>
    );
  }

  const courseFeatures = Array.isArray((course as { features?: string[] }).features)
    ? ((course as { features?: string[] }).features ?? []).filter(Boolean)
    : [];

  const enrollSidebar = liveEnroll ? (
    <LiveCourseEnrollSidebar
      courseId={courseId}
      courseTitle={course.title}
      thumbnailUrl={course.thumbnailUrl as string | undefined}
      isPaid={Boolean(course.isPaid)}
      finalPrice={course.finalPrice ?? 0}
      monthlyPrice={(course as { monthlyPrice?: number }).monthlyPrice}
      features={courseFeatures}
    />
  ) : (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-editorial lg:sticky lg:top-28">
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
        {course.thumbnailUrl ? (
          <Image
            src={resolveImageSrc(course.thumbnailUrl as string)}
            alt={course.title}
            fill
            className="object-cover"
            sizes="(max-width: 1024px) 100vw, 33vw"
            unoptimized
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Course
          </div>
        )}
      </div>
      <div className="mt-6 flex items-baseline justify-between gap-4">
        <span className="text-2xl md:text-3xl font-black text-primary">
          <span className='text-3xl md:text-4xl mr-1'>৳</span>
          {course.isPaid ? `${course.finalPrice}` : "Free"}
        </span>
        {canSeeStudentCount && course.enrollmentCount ? (
          <span className="text-sm text-muted-foreground">
            {course.enrollmentCount} learners
          </span>
        ) : null}
      </div>
      <CourseEnrollFeatures features={courseFeatures} />
      <div className="mt-4 space-y-3">
        {enrollmentState === "enrolled" ? (
          <PrimaryOutLineBtn
            value="Enrolled"
            handleBtn={() => router.push(`/student/courses`)}
          />
        ) : enrollmentState === "pending" ? (
          <PrimaryOutLineBtn value="Pending enrollment" handleBtn={() => {}} disabled />
        ) : (
          <>
            <PrimaryOutLineBtn
              value={
                isPending
                  ? "Loading..."
                  : enrollmentButtonLabel("none", {
                      isFree: isCourseFree(course.isPaid, course.finalPrice),
                    })
              }
              handleBtn={handleCourseEnroll}
              disabled={isPending}
            />
            {course.isPaid && (
              cashEnrollDone ? (
                <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-center text-sm text-emerald-700">
                  Cash enrollment request submitted. Awaiting approval.
                </p>
              ) : (
                <PrimaryActionBtn
                  value="Enrolled in cash"
                  handleBtn={() => setShowCashEnroll(true)}
                  disabled={isPending}
                />
              )
            )}
          </>
        )}
        {course.isPaid && enrollmentState === "none" && !cashEnrollDone && (
          <PrimaryActionBtn
            value={isPending ? "Loading..." : "Add to Cart"}
            handleBtn={handleAddToCart}
            disabled={isPending}
          />
        )}
      </div>
    </div>
  );

  return (
    <FadeIn className="space-y-12">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
      <aside className="order-first lg:order-last lg:col-span-4">
        {enrollSidebar}
      </aside>

      <div className="lg:col-span-8">
        <p className="text-sm font-semibold uppercase tracking-wider text-secondary">
          {course.difficulty ?? "Course"}
        </p>
        <h1 className="mt-2 font-headline text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
          {course.title}
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          {course.shortDescription}
        </p>

        {/* Sticky Mini-Navbar */}
        <div className="sticky top-[76px] md:top-[92px] z-40 my-6 border-b border-border/60 bg-background/95 pt-4 py-1 rounded-sm shadow-sm backdrop-blur-md">
          <nav className="flex justify-around items-center gap-8 overflow-x-auto scrollbar-hide">
            {navSections.map((sectionId) => {
              const label =
                sectionId === "faq"
                  ? "FAQ"
                  : sectionId === "batches"
                    ? "Batches"
                    : sectionId.charAt(0).toUpperCase() + sectionId.slice(1);
              const active = activeSection === sectionId;
              return (
                <button
                  key={sectionId}
                  onClick={() => scrollToSection(sectionId)}
                  className={cn(
                    "relative pb-3 text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer",
                    active
                      ? "text-primary border-b-2 border-primary -mb-[2px]"
                      : "text-muted-foreground hover:text-foreground border-b-2 border-transparent -mb-[2px]",
                  )}
                >
                  {label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* About Section Wrapper */}
        <section id="about" className="scroll-mt-[140px] md:scroll-mt-[160px] mt-8">
          <h2 className="font-headline text-2xl font-bold text-foreground mb-6">
            About This Course
          </h2>
          
          {/* Description */}
          {course.description ? (
            <RichHtml
              className="prose max-w-none text-muted-foreground text-sm leading-relaxed"
              html={course.description}
            />
          ) : course.shortDescription ? (
            <p className="text-muted-foreground text-sm leading-relaxed">
              {course.shortDescription}
            </p>
          ) : (
            <p className="text-muted-foreground text-sm leading-relaxed italic">
              No description available for this course.
            </p>
          )}

          {/* Meta Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 p-4 rounded-md bg-surface border border-border/40 shadow-sm">
            {(course as { grade?: string }).grade ? (
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Class / grade</span>
                <div className="flex items-center gap-1.5 text-foreground font-semibold text-sm">
                  {formatGradeLabel((course as { grade?: string }).grade)}
                </div>
              </div>
            ) : null}
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Difficulty</span>
              <div className="flex items-center gap-1.5 text-foreground font-semibold text-sm">
                <LuChartBar className="w-4 h-4 text-primary" />
                <span className="capitalize">{course.difficulty ?? "All Levels"}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Lessons</span>
              <div className="flex items-center gap-1.5 text-foreground font-semibold text-sm">
                <LuCirclePlay className="w-4 h-4 text-primary" />
                <span>{lessons.length || course.lessonCount || 0} Lessons</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Chapters</span>
              <div className="flex items-center gap-1.5 text-foreground font-semibold text-sm">
                <LuLayers className="w-4 h-4 text-primary" />
                <span>{visibleChapters.length} Chapters</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Language</span>
              <div className="flex items-center gap-1.5 text-foreground font-semibold text-sm">
                <LuLanguages className="w-4 h-4 text-primary" />
                <span>{(course as any).language ?? "English"}</span>
              </div>
            </div>
          </div>

          {/* What you will learn */}
          {/* <div className="mt-8 pt-8 border-t border-border/40">
            <h3 className="font-headline text-lg font-bold text-foreground mb-4">
              What you&apos;ll learn
            </h3>
            {(course as any).highlights && (course as any).highlights.length > 0 ? (
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(course as any).highlights.map((highlight: string, i: number) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <LuCircleCheck className="w-5 h-5 text-tertiary shrink-0 mt-0.5" />
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            ) : (course as any).objectives && (course as any).objectives.length > 0 ? (
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {(course as any).objectives.map((objective: string, i: number) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                    <LuCircleCheck className="w-5 h-5 text-tertiary shrink-0 mt-0.5" />
                    <span>{objective}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-xl border border-border/40 bg-surface/50 p-4 text-center">
                <p className="text-sm text-muted-foreground italic">
                  No specific learning objectives have been listed for this course yet.
                </p>
              </div>
            )}
          </div> */}
        </section>

        {/* Instructor Section Wrapper */}
        <section id="instructor" className="scroll-mt-[140px] md:scroll-mt-[160px] mt-12">
          <h2 className="font-headline text-2xl font-bold text-foreground mb-6">
            Instructor
          </h2>
          {instructor ? (
            <div className="rounded-md border border-border/60 bg-card p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <div className="relative shrink-0 w-20 h-20 rounded-full overflow-hidden border-2 border-primary/20 bg-muted flex items-center justify-center">
                  {instructor.avatar ? (
                    <Image
                      src={instructor.avatar}
                      alt={instructor.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-bold text-primary">
                      {instructor.name?.charAt(0).toUpperCase() || "U"}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-xl font-bold text-foreground">
                    {instructor.name}
                  </h3>
                  <p className="text-sm font-semibold text-primary mt-1">
                    {instructor.specialization || instructor.role || "Instructor"}
                  </p>
                  {instructor.experience && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {instructor.experience}
                    </p>
                  )}
                </div>
              </div>

              {instructor.bio && (
                <p className="mt-6 text-sm leading-relaxed text-muted-foreground">
                  {instructor.bio}
                </p>
              )}

              <div className="mt-6 pt-6 border-t border-border/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {/* Stats — student count only for admin / course owner */}
                <div className="flex flex-wrap gap-6">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <LuBookOpen className="text-primary w-4 h-4" />
                    <span>{instructor.coursesCount ?? 0} Courses</span>
                  </div>
                  {canSeeStudentCount ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <LuUsers className="text-primary w-4 h-4" />
                      <span>{instructor.studentsCount ?? 0} Students</span>
                    </div>
                  ) : null}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <LuStar className="text-secondary w-4 h-4 fill-secondary" />
                    <span>{(instructor.rating ?? 0).toFixed(1)} Rating</span>
                  </div>
                </div>

                {/* Social Links */}
                {instructor.socialLinks && (
                  <div className="flex items-center gap-3">
                    {instructor.socialLinks.linkedin && (
                      <a
                        href={instructor.socialLinks.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-surface border border-border/50 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                        title="LinkedIn"
                      >
                        <LuLinkedin className="w-4 h-4" />
                      </a>
                    )}
                    {instructor.socialLinks.twitter && (
                      <a
                        href={instructor.socialLinks.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-surface border border-border/50 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                        title="Twitter"
                      >
                        <LuTwitter className="w-4 h-4" />
                      </a>
                    )}
                    {instructor.socialLinks.website && (
                      <a
                        href={instructor.socialLinks.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-surface border border-border/50 text-muted-foreground hover:text-primary transition-colors cursor-pointer"
                        title="Website"
                      >
                        <LuGlobe className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Instructor profile is not available.</p>
          )}
        </section>

        {/* Curriculum Section Wrapper */}
        <section id="curriculum" className="scroll-mt-[140px] md:scroll-mt-[160px] mt-12">
          <h2 className="font-headline text-2xl font-bold text-foreground mb-6">
            Curriculum
          </h2>
          {visibleChapters.length === 0 ? (
            <p className="mt-6 text-sm text-muted-foreground">
              Detailed curriculum will appear once chapters and lessons are
              published.
            </p>
          ) : (
            <div className="rounded-md border border-border/80 overflow-hidden shadow-sm">
              {visibleChapters.map((chapter) => {
                const isExpanded = !!expandedChapters[chapter._id];
                const chapterLessons = lessonsByChapter.get(chapter._id) ?? [];
                const durationText = getChapterDuration(chapter._id);

                return (
                  <div key={chapter._id} className="border-b border-border/60 last:border-b-0">
                    {/* Chapter Header Accordion */}
                    <div
                      onClick={() => toggleChapter(chapter._id)}
                      className="flex items-center justify-between px-6 py-4 hover:bg-muted/20 cursor-pointer select-none transition-colors duration-200"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 min-w-0">
                        <h3 className="font-headline font-bold text-foreground text-base truncate">
                          {chapter.title}
                        </h3>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium shrink-0">
                          <span>{chapterLessons.length} Lessons</span>
                          {durationText && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                              <span>{durationText}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-muted-foreground hover:text-foreground p-1 transition-colors">
                        {isExpanded ? (
                          <LuChevronUp className="w-5 h-5" />
                        ) : (
                          <LuChevronDown className="w-5 h-5" />
                        )}
                      </div>
                    </div>

                    {/* Chapter Lessons */}
                    {isExpanded && (
                      <div className="p-4 bg-card border-t border-border/40 animate-in slide-in-from-top-2 duration-200">
                        {chapterLessons.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic p-2">
                            No lessons listed under this chapter yet.
                          </p>
                        ) : (
                          chapterLessons.map((lesson) => {
                            const isFreeLesson = !!lesson.isFree;
                            const showPlayButton = isFreeLesson || isEnrolled;
                            const lessonExpanded = expandedLessonId === lesson._id;
                            const items = lesson.items;
                            const courseItems: Array<{
                              key: string;
                              title: string;
                              subtitle: string;
                              icon: typeof LuVideo;
                              previewable?: boolean;
                            }> = [];
                            if (items?.hasLive) {
                              courseItems.push({
                                key: "live",
                                title: "Live Class",
                                subtitle: "Scheduled class session",
                                icon: LuVideo,
                              });
                            }
                            if (items?.hasVideo) {
                              courseItems.push({
                                key: "video",
                                title: items?.hasLive
                                  ? "Class Recording"
                                  : "Recorded Lesson",
                                subtitle: isFreeLesson
                                  ? "Free preview available"
                                  : "Watch lesson video",
                                icon: LuCirclePlay,
                                previewable: isFreeLesson,
                              });
                            }
                            if (items?.hasNotes || lesson.pdfUrl) {
                              courseItems.push({
                                key: "notes",
                                title: "Class Notes",
                                subtitle: "Lesson document",
                                icon: LuFileText,
                              });
                            }
                            for (const worksheet of items?.worksheets || []) {
                              courseItems.push({
                                key: `ws-${worksheet._id}`,
                                title: worksheet.title,
                                subtitle: "Practice worksheet",
                                icon: LuFileText,
                              });
                            }
                            for (const assignment of items?.assignments || []) {
                              courseItems.push({
                                key: `as-${assignment._id}`,
                                title: assignment.title,
                                subtitle: assignment.totalMarks
                                  ? `${assignment.totalMarks} marks`
                                  : "Assignment",
                                icon: LuClipboardList,
                              });
                            }
                            for (const test of items?.tests || []) {
                              courseItems.push({
                                key: `test-${test._id}`,
                                title: test.title,
                                subtitle: `${test.questionCount || 0} questions · ${test.totalMarks || 0} marks`,
                                icon: LuFileCheck2,
                              });
                            }
                            if ((items?.attachmentCount || 0) > 0) {
                              courseItems.push({
                                key: "attachments",
                                title: "Attachments",
                                subtitle: `${items?.attachmentCount} material${items?.attachmentCount === 1 ? "" : "s"}`,
                                icon: LuPaperclip,
                              });
                            }

                            return (
                              <div
                                key={lesson._id}
                                className="mb-1 last:mb-0 rounded-md border border-transparent hover:border-border/40"
                              >
                                <div
                                  onClick={() =>
                                    setExpandedLessonId(lessonExpanded ? "" : lesson._id)
                                  }
                                  className="flex items-center justify-between p-3 rounded-md hover:bg-muted/20 transition-all cursor-pointer select-none group"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    {showPlayButton ? (
                                      <LuCirclePlay className="w-5 h-5 text-primary shrink-0 group-hover:scale-110 transition-transform duration-200" />
                                    ) : (
                                      <LuLock className="w-5 h-5 text-muted-foreground shrink-0" />
                                    )}
                                    <span className="text-sm font-semibold text-foreground/90 group-hover:text-primary transition-colors duration-200 truncate">
                                      {lesson.title}
                                    </span>
                                    {isFreeLesson && items?.hasVideo ? (
                                      <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-tertiary/10 text-tertiary uppercase tracking-wider shrink-0">
                                        Preview
                                      </span>
                                    ) : null}
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-xs font-medium text-muted-foreground/80">
                                      {formatLessonDuration(lesson.duration || lesson.videoDuration)}
                                    </span>
                                    {lessonExpanded ? (
                                      <LuChevronUp className="w-4 h-4 text-muted-foreground" />
                                    ) : (
                                      <LuChevronDown className="w-4 h-4 text-muted-foreground" />
                                    )}
                                  </div>
                                </div>

                                {lessonExpanded ? (
                                  courseItems.length === 0 ? (
                                    <p className="px-3 pb-3 text-xs text-muted-foreground italic">
                                      No materials added to this lesson yet.
                                    </p>
                                  ) : (
                                  <div className="grid grid-cols-1 gap-2 px-3 pb-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {courseItems.map((item) => {
                                      const canPreviewVideo =
                                        item.key === "video" && item.previewable;
                                      const canOpen =
                                        canPreviewVideo ||
                                        (showPlayButton &&
                                          (item.key === "video" || item.key === "notes"));
                                      return (
                                        <button
                                          key={item.key}
                                          type="button"
                                          onClick={(event) => {
                                            event.stopPropagation();
                                            if (canPreviewVideo) {
                                              openPublicVideoPreview(lesson);
                                              return;
                                            }
                                            if (canOpen) {
                                              handleLessonClick(lesson);
                                              return;
                                            }
                                            if (!isAuthenticated) {
                                              setSelectedLesson(lesson);
                                              setActiveModal("login");
                                              return;
                                            }
                                            if (!isEnrolled) {
                                              setSelectedLesson(lesson);
                                              setActiveModal("enroll");
                                            }
                                          }}
                                          className="flex items-start gap-3 rounded-lg border border-border/50 bg-muted/10 p-3 text-left transition hover:bg-muted/25"
                                        >
                                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground">
                                            {canOpen ? (
                                              <item.icon className="h-4 w-4 text-primary" />
                                            ) : (
                                              <LuLock className="h-3.5 w-3.5" />
                                            )}
                                          </span>
                                          <span className="min-w-0 flex-1">
                                            <span className="block text-sm font-semibold text-foreground">
                                              {item.title}
                                            </span>
                                            <span className="mt-0.5 block text-xs text-muted-foreground">
                                              {item.subtitle}
                                            </span>
                                          </span>
                                          {canPreviewVideo ? (
                                            <span className="shrink-0 self-center rounded-md bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-on-primary">
                                              Preview
                                            </span>
                                          ) : null}
                                        </button>
                                      );
                                    })}
                                  </div>
                                  )
                                ) : null}
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {liveEnroll && (
          <section id="batches" className="scroll-mt-[140px] md:scroll-mt-[160px] mt-12">
            <h2 className="font-headline text-2xl font-bold text-foreground mb-6">
              Batch sections
            </h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Choose a section when enrolling. All sections share the same course
              price and curriculum.
            </p>
            <LiveBatchesSection courseId={courseId} />
          </section>
        )}

        {/* FAQ Section Wrapper */}
        <section id="faq" className="scroll-mt-[140px] md:scroll-mt-[160px] mt-16">
          {faqs.length > 0 && (
            <>
              <h2 className="font-headline text-2xl font-bold text-foreground">
                FAQ
              </h2>
              <dl className="mt-4 border border-border/30 rounded-lg overflow-hidden transition-all duration-300">
                {faqs.map((f, i) => (
                  <CourseFAQ key={i} q={f.question} a={f.answer} courseId={courseId} isFirst={i === 0} />
                ))}
              </dl>
            </>
          )}
        </section>
      </div>
      </div>

      {recommendedCourses.length > 0 ? (
        <section id="recommended-courses" className="scroll-mt-[140px]">
          <h2 className="font-headline text-2xl font-bold text-foreground mb-6">
            Recommended courses
          </h2>
          <p className="mb-6 text-sm text-muted-foreground">
            More courses in the same subject or grade level.
          </p>
          <div className="grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
            {recommendedCourses.map((row, index) => (
              <CourseCard
                key={row._id}
                course={mapPublicCourseRowToCard(row, recommendedHrefPrefix)}
                index={index}
              />
            ))}
          </div>
        </section>
      ) : null}

      {!liveEnroll && course && (
        <CashPaymentModal
          open={showCashEnroll}
          onClose={() => setShowCashEnroll(false)}
          target={{
            kind: "course",
            id: course._id,
            title: course.title,
            billingPlan: "full",
            amount: course.isPaid ? Number(course.finalPrice) || 0 : 0,
            monthlyAmount: (course as { monthlyPrice?: number }).monthlyPrice,
            allowMonthly: Boolean(
              (course as { monthlyPrice?: number }).monthlyPrice &&
                (course as { monthlyPrice?: number }).monthlyPrice! > 0,
            ),
          }}
          onSubmitted={() => setCashEnrollDone(true)}
        />
      )}

      {/* Light-weight custom modals */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          {/* Backdrop Click Close */}
          <div className="absolute inset-0" onClick={() => setActiveModal(null)} />

          {/* Modal Container */}
          {activeModal === "login" && (
            <div className="relative z-10 w-full max-w-md bg-card border border-border/80 rounded-2xl shadow-2xl p-6 transform scale-100 transition-transform animate-in zoom-in-95 duration-200">
              <button
                onClick={() => setActiveModal(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <LuX className="w-5 h-5" />
              </button>
              
              <div className="text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <LuLock className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">
                  Log in to watch
                </h3>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  Please log in to your account to view this lesson.
                </p>
                <div className="flex flex-col gap-2">
                  <Link
                    href="/login"
                    className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-primary text-on-primary font-semibold text-sm hover:opacity-90 transition-opacity"
                  >
                    Log In
                  </Link>
                  <button
                    onClick={() => setActiveModal(null)}
                    className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-surface border border-border text-foreground font-semibold text-sm hover:bg-muted/30 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeModal === "enroll" && (
            <div className="relative z-10 w-full max-w-md bg-card border border-border/80 rounded-2xl shadow-2xl p-6 transform scale-100 transition-transform animate-in zoom-in-95 duration-200">
              <button
                onClick={() => setActiveModal(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <LuX className="w-5 h-5" />
              </button>
              
              <div className="text-center">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <LuLock className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">
                  Enroll to watch all lessons
                </h3>
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  This is a premium lesson. Please enroll in the course to unlock full access to all learning materials.
                </p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      setActiveModal(null);
                      handleCourseEnroll();
                    }}
                    className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-primary text-on-primary font-semibold text-sm hover:opacity-90 transition-opacity"
                  >
                    {enrollmentButtonLabel(enrollmentState, {
                      isFree: isCourseFree(course?.isPaid, course?.finalPrice),
                    })}
                  </button>
                  <button
                    onClick={() => setActiveModal(null)}
                    className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-surface border border-border text-foreground font-semibold text-sm hover:bg-muted/30 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <VideoPlayerModal
        open={Boolean(previewLesson)}
        onOpenChange={(open) => {
          if (!open) setPreviewLesson(null);
        }}
        title={previewLesson?.title || "Lesson preview"}
        youtubeVideoId={previewLesson?.youtubeVideoId}
        videoUrl={previewLesson?.videoUrl}
      />
    </FadeIn>
  );
}

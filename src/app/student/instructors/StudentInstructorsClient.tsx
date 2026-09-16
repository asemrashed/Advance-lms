"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  LuBadgeCheck,
  LuBookOpen,
  LuSearch,
  LuStar,
  LuUsers,
} from "react-icons/lu";
import { StudentRoleShell } from "@/components/role-area/StudentRoleShell";
import { apiFetch } from "@/lib/api/httpClient";
import { useRecordedCoursesEnabled } from "@/hooks/useRecordedCoursesEnabled";
import {
  PUBLIC_ENROLL_HREF,
  RECORDED_COURSES_CATALOG_HREF,
} from "@/lib/studentPortalSettings";

type Instructor = {
  id: string;
  name: string;
  specialization: string | null;
  experience: string | null;
  bio: string | null;
  subjects: string[];
  courseTags: string[];
  courses: { id: string; title: string }[];
  rating: number | null;
  reviewCount: number;
  isEnrolled: boolean;
};

const ALL_SUBJECTS = "all";

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function StudentInstructorsClient() {
  const { recordedCoursesEnabled } = useRecordedCoursesEnabled();
  const [subjects, setSubjects] = useState<string[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [subject, setSubject] = useState(ALL_SUBJECTS);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await apiFetch("/api/student/instructors");
        const payload = await response.json();
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error || "Unable to load instructors");
        }
        if (!cancelled) {
          setSubjects(payload.data?.subjects ?? []);
          setInstructors(payload.data?.instructors ?? []);
        }
      } catch (reason) {
        if (!cancelled) {
          setError(
            reason instanceof Error
              ? reason.message
              : "Unable to load instructors",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const visibleInstructors = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return instructors.filter((instructor) => {
      if (
        subject !== ALL_SUBJECTS &&
        !instructor.subjects.includes(subject)
      ) {
        return false;
      }
      if (!query) return true;
      return [
        instructor.name,
        instructor.specialization,
        instructor.experience,
        ...instructor.subjects,
        ...instructor.courseTags,
      ].some((value) => value?.toLocaleLowerCase().includes(query));
    });
  }, [instructors, search, subject]);

  return (
    <StudentRoleShell>
      <main className="relative z-10 min-h-full p-3 sm:p-5 lg:p-7">
        <header className="mb-6">
          <p className="mb-1 text-xs font-bold uppercase tracking-[0.2em] text-green-700">
            Learn from experts
          </p>
          <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            Browse Instructors
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Find your next course from our active instructors.
          </p>
        </header>

        <section className="mb-5 space-y-4 rounded-2xl border border-green-100 bg-white/90 p-3 shadow-sm sm:p-4">
          <div
            className="flex gap-2 overflow-x-auto pb-1"
            aria-label="Filter by subject"
          >
            <button
              type="button"
              onClick={() => setSubject(ALL_SUBJECTS)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
                subject === ALL_SUBJECTS
                  ? "bg-green-700 text-white shadow-sm"
                  : "bg-green-50 text-green-900 hover:bg-green-100"
              }`}
            >
              All subjects
            </button>
            {subjects.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setSubject(item)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${
                  subject === item
                    ? "bg-green-700 text-white shadow-sm"
                    : "bg-green-50 text-green-900 hover:bg-green-100"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <label className="relative block sm:max-w-md">
            <LuSearch
              className="absolute left-3 top-1/2 -translate-y-1/2 text-green-700"
              aria-hidden
            />
            <span className="sr-only">Search instructors</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search instructors, subjects or courses..."
              className="w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-600/15"
            />
          </label>
        </section>

        {loading ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((item) => (
              <div
                key={item}
                className="h-96 animate-pulse rounded-2xl bg-muted"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center text-sm font-medium text-red-700">
            {error}
          </div>
        ) : visibleInstructors.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-green-200 bg-green-50/40 px-6 py-14 text-center">
            <LuUsers className="mx-auto mb-3 h-9 w-9 text-green-700" />
            <h2 className="font-bold text-foreground">No instructors found</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Try another subject or search term.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {visibleInstructors.map((instructor) => (
              <article
                key={instructor.id}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:border-green-300 hover:shadow-md"
              >
                <div className="relative flex h-28 items-end bg-gradient-to-br from-green-950 via-green-800 to-emerald-600 px-5">
                  <div className="absolute inset-0 opacity-20 [background-image:radial-gradient(circle_at_80%_15%,white,transparent_35%)]" />
                  {instructor.isEnrolled && (
                    <span className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-lime-300 px-2.5 py-1 text-[11px] font-black text-green-950">
                      <LuBadgeCheck aria-hidden />
                      Enrolled
                    </span>
                  )}
                  <div className="relative grid h-20 w-20 translate-y-8 place-items-center rounded-2xl border-4 border-card bg-green-100 text-2xl font-black text-green-800 shadow-sm">
                    {initials(instructor.name)}
                  </div>
                </div>

                <div className="px-5 pb-5 pt-11">
                  <h2 className="text-lg font-black text-foreground">
                    {instructor.name}
                  </h2>
                  <p className="mt-1 min-h-5 text-sm font-semibold text-green-700">
                    {instructor.subjects.join(" · ") ||
                      instructor.specialization ||
                      "Published course instructor"}
                  </p>

                  <div className="my-4 grid grid-cols-3 divide-x divide-border rounded-xl bg-muted/50 py-3 text-center">
                    <div className="px-2">
                      <div className="font-black text-foreground">
                        {instructor.courses.length}
                      </div>
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Courses
                      </div>
                    </div>
                    <div className="px-2">
                      <div className="flex items-center justify-center gap-1 font-black text-foreground">
                        {instructor.rating ?? "—"}
                        {instructor.rating !== null && (
                          <LuStar className="fill-amber-400 text-amber-400" />
                        )}
                      </div>
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {instructor.reviewCount
                          ? `${instructor.reviewCount} reviews`
                          : "Not rated"}
                      </div>
                    </div>
                    <div className="px-2">
                      <div
                        className="truncate font-black text-foreground"
                        title={instructor.experience ?? undefined}
                      >
                        {instructor.experience || "—"}
                      </div>
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Experience
                      </div>
                    </div>
                  </div>

                  <div className="mb-5 flex min-h-14 flex-wrap content-start gap-1.5">
                    {instructor.courseTags.slice(0, 5).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-[11px] font-bold text-green-800"
                      >
                        {tag}
                      </span>
                    ))}
                    {instructor.courseTags.length > 5 && (
                      <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
                        +{instructor.courseTags.length - 5}
                      </span>
                    )}
                  </div>

                  <Link
                    href={
                      recordedCoursesEnabled
                        ? `${RECORDED_COURSES_CATALOG_HREF}?instructorId=${encodeURIComponent(instructor.id)}`
                        : PUBLIC_ENROLL_HREF
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-700 px-4 py-2.5 text-sm font-black text-white transition hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-600 focus:ring-offset-2"
                  >
                    <LuBookOpen aria-hidden />
                    {recordedCoursesEnabled ? 'View Courses' : 'Enroll more'}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </StudentRoleShell>
  );
}

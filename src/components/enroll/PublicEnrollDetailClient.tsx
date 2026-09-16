'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { LuCircleCheck } from 'react-icons/lu';
import {
  getMyBatchEnrollments,
  initiateBatchPayment,
  registerForBatch,
} from '@/lib/api/batchEnrollmentClient';
import {
  isCourseFree,
  resolveBatchEnrollmentState,
  type EnrollmentUiState,
} from '@/lib/enrollment/enrollmentUiState';
import { BatchEnrollSidebar } from '@/components/enroll/BatchEnrollSidebar';
import { FadeIn } from '@/components/ui/fade-in';
import { BatchDetailSkeleton } from '@/components/skeletons/BatchDetailSkeleton';
import {
  publicBatchesService,
  type PublicBatchRow,
  type PublicBatchRoutineDay,
} from '@/services/publicBatchesService';

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

export function PublicEnrollDetailClient({ batchId }: { batchId: string }) {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [batch, setBatch] = useState<PublicBatchRow | null>(null);
  const [routine, setRoutine] = useState<PublicBatchRoutineDay[]>([]);
  const [siblingBatches, setSiblingBatches] = useState<PublicBatchRow[]>([]);
  const [enrollmentState, setEnrollmentState] = useState<EnrollmentUiState>('none');
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await publicBatchesService.getBatch(batchId);
    if (res.success && res.data) {
      setBatch(res.data.batch);
      setRoutine(res.data.routine ?? []);
    } else {
      setError(res.error || 'Batch not found');
      setBatch(null);
    }
    setLoading(false);
  }, [batchId]);

  useEffect(() => {
    load();
  }, [load]);

  // Prefer course-centric enrollment page when batch belongs to a live course.
  useEffect(() => {
    if (batch?.courseId) {
      router.replace(`/enroll/course/${batch.courseId}`);
    }
  }, [batch?.courseId, router]);

  // Load sibling sections of the same course so students can pick a section.
  useEffect(() => {
    const courseId = batch?.courseId;
    if (!courseId) {
      setSiblingBatches([]);
      return;
    }
    publicBatchesService
      .listBatches({ courseId, limit: 100 })
      .then((res) => {
        setSiblingBatches(res.data?.batches ?? []);
      })
      .catch(() => setSiblingBatches([]));
  }, [batch?.courseId]);

  useEffect(() => {
    if (sessionStatus !== 'authenticated') {
      setEnrollmentState('none');
      return;
    }
    getMyBatchEnrollments()
      .then((res) => {
        setEnrollmentState(
          resolveBatchEnrollmentState(res.data?.enrollments ?? [], batchId),
        );
      })
      .catch(() => setEnrollmentState('none'));
  }, [sessionStatus, batchId]);

  const handleRegister = async (billingPlan?: 'monthly' | 'full') => {
    if (!batch) return;
    setError(null);

    if (!session?.user) {
      router.push(`/login?callbackUrl=${encodeURIComponent(`/enroll/${batchId}`)}`);
      return;
    }
    if (session.user.role !== 'student') {
      setError('Only student accounts can register for batches.');
      return;
    }
    if (batch.isFull) {
      setError('This batch is full.');
      return;
    }
    if (enrollmentState === 'enrolled') {
      router.push('/student/courses');
      return;
    }
    if (enrollmentState === 'pending') {
      setError('Your enrollment is pending payment. Complete payment to activate access.');
      return;
    }

    const fullPrice = batch.coursePrice ?? 0;
    const hasMonthly = Boolean(batch.monthlyFee && batch.monthlyFee > 0);
    const planToUse: 'monthly' | 'full' = billingPlan ?? 'full';
    const amountToPay =
      planToUse === 'monthly' && hasMonthly ? batch.monthlyFee : fullPrice;
    const isFree = isCourseFree(batch.courseIsPaid, amountToPay);

    setRegistering(true);
    try {
      const reg = await registerForBatch(batchId, planToUse);
      if (reg.data?.requiresPayment && !isFree) {
        const pay = await initiateBatchPayment(batchId, planToUse);
        if (pay.data?.checkout_url) {
          window.location.href = pay.data.checkout_url;
          return;
        }
        if (pay.data?.enrolled) {
          setEnrollmentState('enrolled');
          router.push('/student/courses');
          return;
        }
        throw new Error('No checkout URL returned');
      }
      if (reg.data?.requiresPayment && isFree) {
        const pay = await initiateBatchPayment(batchId);
        if (pay.data?.enrolled) {
          setEnrollmentState('enrolled');
          router.push('/student/courses');
          return;
        }
      }
      setEnrollmentState('enrolled');
      router.push('/student/courses');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      if (
        msg.toLowerCase().includes('payment') ||
        msg.toLowerCase().includes('gateway') ||
        msg.toLowerCase().includes('failed to initiate')
      ) {
        setEnrollmentState('pending');
      }
      if (msg.toLowerCase().includes('already enrolled')) {
        router.push('/student/courses');
        return;
      }
      setError(msg);
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return <BatchDetailSkeleton />;
  }

  if (!batch) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-16 text-center">
        <p className="text-destructive">{error || 'Batch not available.'}</p>
        <Button asChild variant="outline">
          <Link href="/enroll">Back to batches</Link>
        </Button>
      </div>
    );
  }

  const routineRows = routine.flatMap((day) =>
    day.slots.map((slot) => ({
      day: day.label,
      time: `${slot.startTime} – ${slot.endTime}`,
      title: slot.title || 'Session',
    })),
  );

  const highlightFeatures = batch.features.slice(0, 4);

  return (
    <FadeIn className="min-h-screen bg-background">
      <section className="relative overflow-hidden bg-surface px-4 py-14 text-foreground md:px-8">
        <div className="pointer-events-none absolute inset-0 z-0" aria-hidden>
          <Image
            src="/images/hero-background.svg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-top opacity-60"
          />
        </div>
        <div className="relative z-10 mx-auto max-w-6xl">
          <Button asChild variant="ghost" size="sm" className="mb-4 text-muted-foreground hover:text-foreground">
            <Link href="/enroll">← All batches</Link>
          </Button>
          <p className="text-sm font-medium uppercase tracking-wider text-primary">
            Grade {batch.grade}
          </p>
          <h1 className="mt-2 max-w-3xl text-3xl font-black leading-tight md:text-4xl">
            {batch.name}
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted-foreground">{batch.shortDescription}</p>
        </div>
      </section>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 md:px-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-10">
          {siblingBatches.length > 1 && (
            <section>
              <h2 className="mb-1 text-xl font-bold">Choose your section</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                This course runs in multiple sections. Pick the one with seats
                available.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {siblingBatches.map((section) => {
                  const isCurrent = section._id === batchId;
                  const full = section.isFull;
                  return (
                    <div
                      key={section._id}
                      className={`rounded-xl border p-4 transition-colors ${
                        isCurrent
                          ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-100'
                          : full
                            ? 'border-border bg-muted/40 opacity-70'
                            : 'border-border bg-card hover:border-emerald-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold">{section.name}</p>
                        {isCurrent && (
                          <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-medium text-white">
                            Selected
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {full
                          ? 'Full'
                          : `${section.seatsRemaining} of ${section.maxStudents} seats left`}
                      </p>
                      <div className="mt-3">
                        {isCurrent ? (
                          <Button size="sm" variant="outline" disabled className="w-full">
                            Viewing this section
                          </Button>
                        ) : full ? (
                          <Button size="sm" variant="outline" disabled className="w-full">
                            Section full
                          </Button>
                        ) : (
                          <Button asChild size="sm" className="w-full">
                            <Link href={`/enroll/${section._id}`}>
                              Select this section
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {highlightFeatures.length > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-bold">Why this batch</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {highlightFeatures.map((text, i) => (
                  <div
                    key={i}
                    className="rounded-xl border bg-card p-4 shadow-sm"
                  >
                    <LuCircleCheck className="mb-2 h-5 w-5 text-emerald-600" />
                    <p className="text-sm font-medium">{text}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="rounded-xl border bg-card p-6">
            <h2 className="mb-4 text-xl font-bold">Instructor</h2>
            <div className="flex items-center gap-4">
              <div className="relative h-16 w-16 overflow-hidden rounded-full bg-muted">
                {batch.instructorAvatar ? (
                  <Image
                    src={batch.instructorAvatar}
                    alt={batch.instructorName}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-lg font-bold text-muted-foreground">
                    {batch.instructorName.charAt(0)}
                  </div>
                )}
              </div>
              <div>
                <p className="font-semibold">{batch.instructorName}</p>
                <p className="text-sm text-muted-foreground">{batch.subject}</p>
              </div>
            </div>
          </section>

          {batch.description && (
            <section>
              <h2 className="mb-3 text-xl font-bold">About this batch</h2>
              <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed">
                {batch.description}
              </p>
            </section>
          )}

          {routineRows.length > 0 && (
            <section>
              <h2 className="mb-4 text-xl font-bold">Class routine</h2>
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50 text-left">
                      <th className="p-3 font-semibold">Day</th>
                      <th className="p-3 font-semibold">Time</th>
                      <th className="p-3 font-semibold">Topic</th>
                    </tr>
                  </thead>
                  <tbody>
                    {routineRows.map((row, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="p-3">{row.day}</td>
                        <td className="p-3">{row.time}</td>
                        <td className="p-3">{row.title}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section className="text-sm text-muted-foreground">
            <p>
              Duration: {formatDate(batch.startDate)} — {formatDate(batch.endDate)}
            </p>
          </section>
        </div>

        <BatchEnrollSidebar
          batch={batch}
          enrollmentState={enrollmentState}
          registering={registering}
          error={error}
          onEnroll={handleRegister}
        />
      </div>
    </FadeIn>
  );
}

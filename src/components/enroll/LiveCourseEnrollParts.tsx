'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleHeader,
} from '@/components/ui/collapsible';
import { LuClock } from 'react-icons/lu';
import { registerForBatch } from '@/lib/api/batchEnrollmentClient';
import {
  getMyEnrollments,
  type MyEnrollmentRow,
} from '@/lib/api/enrollmentClient';
import {
  enrollmentButtonLabel,
  isCourseFree,
  resolveLiveCourseBatchState,
  type EnrollmentUiState,
} from '@/lib/enrollment/enrollmentUiState';
import {
  publicLiveCoursesService,
  type PublicLiveCourseBatch,
} from '@/services/publicLiveCoursesService';
import { CourseEnrollFeatures } from '@/components/courses/CourseEnrollFeatures';
import { CashPaymentModal } from '@/components/payments/CashPaymentModal';
import { RequestDiscountModal } from '@/components/enroll/RequestDiscountModal';
import {
  discountRequestsService,
  type StudentCoursePricingState,
} from '@/services/discountRequestsService';
import { usePayment } from '@/hooks/usePayment';
import { resolveImageSrc } from '@/lib/resolveImageSrc';

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

function buildBatchStateMap(
  enrollments: MyEnrollmentRow[],
  courseId: string,
): Map<string, EnrollmentUiState> {
  const map = new Map<string, EnrollmentUiState>();
  for (const row of enrollments) {
    const batchId = String(row.selectedBatchId ?? row.batchId ?? '');
    if (!batchId) continue;
    const state = resolveLiveCourseBatchState(enrollments, courseId, batchId);
    if (state !== 'none') map.set(batchId, state);
  }
  return map;
}

export function LiveBatchesSection({ courseId }: { courseId: string }) {
  const [batches, setBatches] = useState<PublicLiveCourseBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [openBatchId, setOpenBatchId] = useState<string | null>(null);

  const refreshBatches = useCallback(async () => {
    setLoading(true);
    try {
      const res = await publicLiveCoursesService.getLiveCourse(courseId);
      const rows = res.data?.batches ?? [];
      setBatches(rows);
      if (rows.length > 0) {
        setOpenBatchId((current) =>
          current && rows.some((row) => row.batch._id === current)
            ? current
            : rows[0].batch._id,
        );
      }
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void refreshBatches();
  }, [refreshBatches]);

  useEffect(() => {
    const refreshOnFocus = () => {
      void refreshBatches();
    };

    window.addEventListener('focus', refreshOnFocus);
    document.addEventListener('visibilitychange', refreshOnFocus);
    return () => {
      window.removeEventListener('focus', refreshOnFocus);
      document.removeEventListener('visibilitychange', refreshOnFocus);
    };
  }, [refreshBatches]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading batch sections…</p>;
  }

  if (batches.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No batch sections are open for enrollment yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {batches.map((row) => {
        const { batch, routine } = row;
        const isOpen = openBatchId === batch._id;
        const routineRows = routine.flatMap((day) =>
          day.slots.map((slot) => ({
            day: day.label,
            time: `${slot.startTime} – ${slot.endTime}`,
            title: slot.title || 'Session',
          })),
        );

        return (
          <div
            key={batch._id}
            className={`rounded-xl border bg-card transition-colors duration-200 ${
              isOpen ? 'border-primary/30 shadow-sm' : 'border-border'
            }`}
          >
            <Collapsible
              open={isOpen}
              onOpenChange={(open) => setOpenBatchId(open ? batch._id : null)}
            >
              <CollapsibleHeader className="px-4 py-3.5 hover:bg-muted/30 transition-colors duration-200">
                <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-1 pr-2 text-left">
                  <span className="font-semibold text-foreground">{batch.name}</span>
                  <span className="text-sm text-muted-foreground">
                    {batch.isFull
                      ? 'Full'
                      : `${batch.seatsRemaining} of ${batch.maxStudents} seats left`}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {formatDate(batch.startDate)} – {formatDate(batch.endDate)}
                  </span>
                </div>
              </CollapsibleHeader>
              <CollapsibleContent className="border-t px-4 py-3">
                {routineRows.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 pr-3 font-medium">Day</th>
                        <th className="pb-2 pr-3 font-medium">Time</th>
                        <th className="pb-2 font-medium">Topic</th>
                      </tr>
                    </thead>
                    <tbody>
                      {routineRows.map((r, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-2 pr-3">{r.day}</td>
                          <td className="py-2 pr-3">{r.time}</td>
                          <td className="py-2">{r.title}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Schedule not published yet.
                  </p>
                )}
                <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <LuClock className="h-4 w-4" />
                    {formatDate(batch.startDate)} – {formatDate(batch.endDate)}
                  </span>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>
        );
      })}
    </div>
  );
}

export function LiveCourseEnrollSidebar({
  courseId,
  courseTitle,
  thumbnailUrl,
  isPaid,
  finalPrice,
  monthlyPrice,
  features = [],
}: {
  courseId: string;
  courseTitle: string;
  thumbnailUrl?: string;
  isPaid: boolean;
  finalPrice: number;
  monthlyPrice?: number;
  features?: string[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();
  const [batches, setBatches] = useState<PublicLiveCourseBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [batchStates, setBatchStates] = useState<Map<string, EnrollmentUiState>>(
    new Map(),
  );
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCash, setShowCash] = useState(false);
  const [cashDone, setCashDone] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const [pricingState, setPricingState] = useState<StudentCoursePricingState | null>(null);
  const { initiatePayment } = usePayment();
  const paymentStatus = searchParams.get('payment');

  const loadSidebarState = useCallback(async () => {
    const [batchRes, enrollmentRes] = await Promise.all([
      publicLiveCoursesService.getLiveCourse(courseId),
      sessionStatus === 'authenticated'
        ? getMyEnrollments().catch(() => ({ data: { enrollments: [] } }))
        : Promise.resolve({ data: { enrollments: [] } }),
    ]);

    const rows = batchRes.data?.batches ?? [];
    const enrollments = enrollmentRes.data?.enrollments ?? [];
    const nextBatchStates = buildBatchStateMap(enrollments, courseId);
    const preferredEnrollment = enrollments.find((row) => {
      const batchId = String(row.selectedBatchId ?? row.batchId ?? '');
      const state = batchId ? nextBatchStates.get(batchId) : 'none';
      return String(row.course) === courseId && (state === 'enrolled' || state === 'pending');
    });
    const preferredBatchId = preferredEnrollment
      ? String(preferredEnrollment.selectedBatchId ?? preferredEnrollment.batchId ?? '')
      : '';
    const firstOpen = rows.find((b) => !b.batch.isFull)?.batch._id ?? rows[0]?.batch._id ?? null;
    const currentStillExists = selectedBatchId && rows.some((b) => b.batch._id === selectedBatchId);
    const nextSelectedBatchId =
      (preferredBatchId && rows.some((b) => b.batch._id === preferredBatchId) && preferredBatchId) ||
      (currentStillExists ? selectedBatchId : null) ||
      firstOpen;

    setBatches(rows);
    setBatchStates(nextBatchStates);
    setSelectedBatchId(nextSelectedBatchId);
  }, [courseId, selectedBatchId, sessionStatus]);

  useEffect(() => {
    void loadSidebarState();
  }, [loadSidebarState, paymentStatus]);

  useEffect(() => {
    const refreshOnFocus = () => {
      void loadSidebarState();
    };

    window.addEventListener('focus', refreshOnFocus);
    document.addEventListener('visibilitychange', refreshOnFocus);
    return () => {
      window.removeEventListener('focus', refreshOnFocus);
      document.removeEventListener('visibilitychange', refreshOnFocus);
    };
  }, [loadSidebarState]);

  const [billingPlan, setBillingPlan] = useState<'full' | 'monthly'>('monthly');

  const selectedBatch = batches.find((b) => b.batch._id === selectedBatchId);
  const selectedState = selectedBatchId
    ? (batchStates.get(selectedBatchId) ?? 'none')
    : 'none';
  const monthlyFee = selectedBatch?.batch.monthlyFee;
  const courseMonthly = monthlyPrice && monthlyPrice > 0 ? monthlyPrice : undefined;
  const effectiveMonthly = courseMonthly ?? monthlyFee;
  const hasMonthlyFee = Boolean(effectiveMonthly && effectiveMonthly > 0);
  const allowMonthly = Boolean(isPaid && hasMonthlyFee);

  const planForPricing = allowMonthly ? billingPlan : 'full';

  const loadPricingState = useCallback(async () => {
    if (sessionStatus !== 'authenticated' || session?.user?.role !== 'student') {
      setPricingState(null);
      return;
    }
    const state = await discountRequestsService.getCoursePricing(
      courseId,
      planForPricing,
    );
    setPricingState(state);
  }, [courseId, planForPricing, session?.user?.role, sessionStatus]);

  useEffect(() => {
    void loadPricingState();
  }, [loadPricingState]);

  useEffect(() => {
    // If full price is missing but monthly fee exists, default to monthly.
    if (allowMonthly && (finalPrice ?? 0) <= 0 && billingPlan !== 'monthly') {
      setBillingPlan('monthly');
    }
    // If monthly option gets disabled, fall back to full.
    if (!allowMonthly && billingPlan !== 'full') {
      setBillingPlan('full');
    }
  }, [allowMonthly, finalPrice, billingPlan]);

  const listAmount =
    pricingState?.listAmount ??
    (billingPlan === 'monthly' && effectiveMonthly ? effectiveMonthly : finalPrice);
  const displayAmount = pricingState?.finalAmount ?? listAmount;
  const hasDiscountDisplay =
    Boolean(pricingState?.hasApprovedDiscount) && displayAmount < listAmount;
  const discountPending = pricingState?.requestStatus === 'pending';
  const selectedAmount = displayAmount;
  const isFree = isCourseFree(isPaid, selectedAmount);
  const fullDisabled = allowMonthly && (finalPrice ?? 0) <= 0;
  const canRequestDiscount =
    sessionStatus === 'authenticated' &&
    session?.user?.role === 'student' &&
    !isFree &&
    selectedState === 'none' &&
    (pricingState?.requestStatus === 'none' ||
      pricingState?.requestStatus === 'rejected');
  const enrollBlocked = discountPending && selectedState === 'none';

  const handleEnroll = async () => {
    if (!selectedBatchId) return;
    setError(null);

    if (!session?.user) {
      router.push(
        `/login?callbackUrl=${encodeURIComponent(`/enroll/course/${courseId}`)}`,
      );
      return;
    }
    if (session.user.role !== 'student') {
      setError('Only student accounts can enroll.');
      return;
    }
    if (selectedBatch?.batch.isFull) {
      setError('This section is full.');
      return;
    }
    if (selectedState === 'enrolled') {
      router.push('/student/courses');
      return;
    }
    if (selectedState === 'pending') {
      setError('Your enrollment is pending payment. Complete payment to activate access.');
      return;
    }

    setRegistering(true);
    try {
      const planToUse = allowMonthly ? billingPlan : 'full';
      const amountForPlan = displayAmount;
      const isPlanFree = isCourseFree(isPaid, amountForPlan);

      if (!isPlanFree) {
        const pay = await initiatePayment({
          courseId,
          selectedBatchId,
          billingPlan: planToUse,
        });
        if (!pay.success) {
          throw new Error(pay.error || 'Payment initiation failed');
        }
        if (pay.data?.checkout_url) {
          setBatchStates((prev) => new Map(prev).set(selectedBatchId, 'pending'));
          window.location.href = pay.data.checkout_url;
          return;
        }
        throw new Error('No checkout URL returned');
      }

      await registerForBatch(selectedBatchId, planToUse);
      setBatchStates((prev) => new Map(prev).set(selectedBatchId, 'enrolled'));
      await loadSidebarState();
      router.push('/student/courses');
      return;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      if (
        msg.toLowerCase().includes('payment') ||
        msg.toLowerCase().includes('gateway') ||
        msg.toLowerCase().includes('failed to initiate')
      ) {
        setBatchStates((prev) => new Map(prev).set(selectedBatchId, 'pending'));
      }
      setError(msg);
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-editorial lg:sticky lg:top-28">
      <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
        {thumbnailUrl ? (
          <img
            src={resolveImageSrc(thumbnailUrl)}
            alt={courseTitle}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Live course
          </div>
        )}
      </div>

      <div className="mt-6">
        {allowMonthly && (
          <div className="mb-3 flex rounded-lg border border-border bg-muted/60 p-1">
            <button
              type="button"
              className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-all ${
                billingPlan === 'monthly'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              onClick={() => setBillingPlan('monthly')}
            >
              Monthly Plan
            </button>
            <button
              type="button"
              className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-all ${
                billingPlan === 'full'
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              disabled={fullDisabled}
              onClick={() => !fullDisabled && setBillingPlan('full')}
            >
              Full Payment
            </button>
          </div>
        )}
        <span className="text-2xl md:text-3xl font-black text-primary">
          {isFree ? (
            'Free'
          ) : (
            <>
              {hasDiscountDisplay && (
                <span className="mr-2 text-lg font-normal text-muted-foreground line-through">
                  ৳{listAmount.toLocaleString()}
                </span>
              )}
              <span className="text-3xl md:text-4xl mr-1">৳</span>
              {displayAmount.toLocaleString()}
              {allowMonthly && billingPlan === 'monthly' && (
                <span className="text-sm font-normal text-muted-foreground ml-1">/ month</span>
              )}
            </>
          )}
        </span>
        {pricingState?.requestStatus === 'approved' && hasDiscountDisplay && (
          <p className="mt-1 text-xs font-medium text-emerald-600">Discount approved</p>
        )}
        {discountPending && (
          <p className="mt-1 text-xs font-medium text-amber-600">Discount request pending</p>
        )}
        {pricingState?.requestStatus === 'rejected' && pricingState.rejectionNote && (
          <p className="mt-1 text-xs text-destructive">{pricingState.rejectionNote}</p>
        )}
        <p className="mt-1 text-sm text-muted-foreground">
          {allowMonthly && billingPlan === 'monthly'
            ? 'Renews monthly until course ends'
            : 'Same price for all batch sections'}
        </p>
      </div>

      <CourseEnrollFeatures features={features} />

      {batches.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-semibold text-foreground">Select batch</p>
          {batches.map(({ batch }) => (
            <button
              key={batch._id}
              type="button"
              disabled={batch.isFull && batchStates.get(batch._id) !== 'enrolled'}
              onClick={() => setSelectedBatchId(batch._id)}
              className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-all duration-200 ${
                selectedBatchId === batch._id
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border hover:border-primary/40 hover:bg-muted/20'
              }`}
            >
              <span className="font-medium">{batch.name}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {batch.isFull
                  ? 'Full'
                  : `${batch.seatsRemaining} seats left`}
              </span>
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
          {error}
        </p>
      )}

      <div className="mt-4">
        {selectedState === 'enrolled' ? (
          <Button className="w-full" asChild>
            <Link href="/student/courses">
              Enrolled
            </Link>
          </Button>
        ) : selectedState === 'pending' ? (
          <Button className="w-full" disabled>
            Pending enrollment
          </Button>
        ) : (
          <div className="space-y-2">
            {enrollBlocked ? (
              <Button className="w-full" disabled>
                Waiting for discount approval
              </Button>
            ) : (
              <Button
                className="w-full"
                disabled={!selectedBatchId || selectedBatch?.batch.isFull || registering}
                onClick={handleEnroll}
              >
                {!selectedBatchId
                  ? 'Select a batch'
                  : selectedBatch?.batch.isFull
                    ? 'Section full'
                    : enrollmentButtonLabel('none', { isFree, loading: registering })}
              </Button>
            )}
            {canRequestDiscount && selectedBatchId && !selectedBatch?.batch.isFull && (
              <Button
                variant="ghost"
                className="w-full text-sm"
                onClick={() => setShowDiscount(true)}
              >
                Request discount
              </Button>
            )}
            {!isFree && selectedBatchId && !selectedBatch?.batch.isFull && !enrollBlocked && (
              cashDone ? (
                <p className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-center text-xs text-emerald-700">
                  Cash enrollment request submitted. Awaiting approval.
                </p>
              ) : (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowCash(true)}
                >
                  Enrolled in cash
                </Button>
              )
            )}
          </div>
        )}
      </div>

      {selectedBatchId && selectedBatch && (
        <CashPaymentModal
          open={showCash}
          onClose={() => setShowCash(false)}
          target={{
            kind: 'course',
            id: courseId,
            batchId: selectedBatchId,
            title: `${courseTitle} — ${selectedBatch.batch.name}`,
            billingPlan: allowMonthly ? billingPlan : 'full',
            amount: displayAmount,
            monthlyAmount: effectiveMonthly,
            allowMonthly,
          }}
          onSubmitted={() => setCashDone(true)}
        />
      )}

      {selectedBatchId && (
        <RequestDiscountModal
          open={showDiscount}
          onClose={() => setShowDiscount(false)}
          target={{
            courseId,
            courseTitle,
            billingPlan: planForPricing,
            listAmount: pricingState?.listAmount ?? listAmount,
            selectedBatchId,
          }}
          onSubmitted={() => void loadPricingState()}
        />
      )}
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { LuCircleCheck, LuBanknote } from 'react-icons/lu';
import { Button } from '@/components/ui/button';
import { toEmbedVideoUrl } from '@/lib/videoEmbed';
import type { PublicBatchRow } from '@/services/publicBatchesService';
import {
  enrollmentButtonLabel,
  type EnrollmentUiState,
} from '@/lib/enrollment/enrollmentUiState';
import { CashPaymentModal } from '@/components/payments/CashPaymentModal';
import { RequestDiscountModal } from '@/components/enroll/RequestDiscountModal';
import {
  discountRequestsService,
  type StudentCoursePricingState,
} from '@/services/discountRequestsService';

export function BatchEnrollSidebar({
  batch,
  enrollmentState,
  registering,
  error,
  onEnroll,
}: {
  batch: PublicBatchRow;
  enrollmentState: EnrollmentUiState;
  registering: boolean;
  error: string | null;
  onEnroll: (billingPlan?: 'monthly' | 'full') => void;
}) {
  const { data: session, status: sessionStatus } = useSession();
  const embedUrl = toEmbedVideoUrl(batch.videoUrl);
  const price = batch.coursePrice ?? 0;
  const monthlyAmount = batch.monthlyFee;
  const hasMonthly = Boolean(monthlyAmount && monthlyAmount > 0);
  const [billingPlan, setBillingPlan] = useState<'full' | 'monthly'>(
    hasMonthly ? 'monthly' : 'full',
  );
  const [showCash, setShowCash] = useState(false);
  const [cashDone, setCashDone] = useState(false);
  const [showDiscount, setShowDiscount] = useState(false);
  const [pricingState, setPricingState] = useState<StudentCoursePricingState | null>(null);

  const allowMonthly = Boolean(batch.courseIsPaid && hasMonthly);
  const fullDisabled = allowMonthly && (price ?? 0) <= 0;
  const planForPricing = allowMonthly ? billingPlan : 'full';

  const loadPricingState = useCallback(async () => {
    if (!batch.courseId || sessionStatus !== 'authenticated' || session?.user?.role !== 'student') {
      setPricingState(null);
      return;
    }
    const state = await discountRequestsService.getCoursePricing(
      batch.courseId,
      planForPricing,
    );
    setPricingState(state);
  }, [batch.courseId, planForPricing, session?.user?.role, sessionStatus]);

  useEffect(() => {
    void loadPricingState();
  }, [loadPricingState]);

  const listAmount =
    pricingState?.listAmount ??
    (billingPlan === 'monthly' && monthlyAmount ? monthlyAmount : price);
  const displayAmount = pricingState?.finalAmount ?? listAmount;
  const hasDiscountDisplay =
    Boolean(pricingState?.hasApprovedDiscount) && displayAmount < listAmount;
  const discountPending = pricingState?.requestStatus === 'pending';
  const isFree = !batch.courseIsPaid || (displayAmount <= 0 && !hasMonthly);
  const canRequestDiscount =
    Boolean(batch.courseId) &&
    sessionStatus === 'authenticated' &&
    session?.user?.role === 'student' &&
    !isFree &&
    enrollmentState === 'none' &&
    (pricingState?.requestStatus === 'none' || pricingState?.requestStatus === 'rejected');
  const enrollBlocked = discountPending && enrollmentState === 'none';

  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <div className="overflow-hidden rounded-xl border bg-card shadow-lg">
        {embedUrl ? (
          <div className="aspect-video w-full bg-black">
            <iframe
              src={embedUrl}
              title="Batch preview"
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : batch.thumbnailUrl ? (
          <div
            className="aspect-video w-full bg-cover bg-center"
            style={{ backgroundImage: `url(${batch.thumbnailUrl})` }}
          />
        ) : (
          <div className="flex aspect-video items-center justify-center bg-slate-900 text-sm text-white/60">
            No preview video
          </div>
        )}

        <div className="space-y-4 p-5">
          <div>
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
            {isFree ? (
              <p className="text-3xl font-black text-primary">Free</p>
            ) : (
              <p className="text-3xl font-black text-primary">
                {hasDiscountDisplay && (
                  <span className="mr-2 text-lg font-normal text-muted-foreground line-through">
                    ৳{listAmount.toLocaleString()}
                  </span>
                )}
                <span className="text-2xl">৳</span>
                {displayAmount.toLocaleString()}
                {allowMonthly && billingPlan === 'monthly' && (
                  <span className="text-sm font-normal text-muted-foreground ml-1">/ month</span>
                )}
              </p>
            )}
            {discountPending && (
              <p className="mt-1 text-xs font-medium text-amber-600">Discount request pending</p>
            )}
            {pricingState?.requestStatus === 'approved' && hasDiscountDisplay && (
              <p className="mt-1 text-xs font-medium text-emerald-600">Discount approved</p>
            )}
            <p className="text-sm text-muted-foreground">
              {allowMonthly && billingPlan === 'monthly'
                ? 'Renews monthly until batch ends'
                : batch.seatsRemaining > 0
                  ? `${batch.seatsRemaining} seats left`
                  : batch.isFull
                    ? 'Batch is full'
                    : 'Limited seats'}
            </p>
          </div>

          {error && (
            <p className="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
              {error}
            </p>
          )}

          {enrollmentState === 'enrolled' ? (
            <Button className="w-full" asChild>
              <a href="/student/courses">Enrolled</a>
            </Button>
          ) : enrollmentState === 'pending' ? (
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
                  className="w-full bg-emerald-600 text-white hover:bg-emerald-700"
                  size="lg"
                  disabled={batch.isFull || registering}
                  onClick={() => onEnroll(allowMonthly ? billingPlan : 'full')}
                >
                  {batch.isFull
                    ? 'Batch full'
                    : enrollmentButtonLabel('none', { isFree, loading: registering })}
                </Button>
              )}
              {canRequestDiscount && !batch.isFull && (
                <Button
                  variant="ghost"
                  className="w-full text-sm"
                  onClick={() => setShowDiscount(true)}
                >
                  Request discount
                </Button>
              )}
              {!isFree && !batch.isFull && !enrollBlocked && (
                cashDone ? (
                  <p className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-center text-xs text-emerald-700">
                    Cash enrollment request submitted. Awaiting approval.
                  </p>
                ) : (
                  <Button
                    variant="outline"
                    className="w-full"
                    size="lg"
                    onClick={() => setShowCash(true)}
                  >
                    <LuBanknote className="mr-2 h-4 w-4" />
                    Enrolled in cash
                  </Button>
                )
              )}
            </div>
          )}

          {batch.features.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="mb-3 text-sm font-bold">What&apos;s included</h3>
              <ul className="space-y-2">
                {batch.features.map((feature, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <LuCircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <CashPaymentModal
        open={showCash}
        onClose={() => setShowCash(false)}
        target={{
          kind: 'batch',
          id: batch._id,
          title: batch.name,
          billingPlan: allowMonthly ? billingPlan : 'full',
          amount: displayAmount,
          monthlyAmount: batch.monthlyFee,
          allowMonthly,
        }}
        onSubmitted={() => setCashDone(true)}
      />

      {batch.courseId && (
        <RequestDiscountModal
          open={showDiscount}
          onClose={() => setShowDiscount(false)}
          target={{
            courseId: batch.courseId,
            courseTitle: batch.name,
            billingPlan: planForPricing,
            listAmount: pricingState?.listAmount ?? listAmount,
            selectedBatchId: batch._id,
          }}
          onSubmitted={() => void loadPricingState()}
        />
      )}
    </aside>
  );
}

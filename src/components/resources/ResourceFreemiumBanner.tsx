"use client";

import Link from "next/link";
import type { ResourceCenterAccess } from "@/types/resourceAccess";
import { LuLock, LuSparkles } from "react-icons/lu";

type ResourceFreemiumBannerProps = {
  access: ResourceCenterAccess;
  context: "public" | "student";
  variant: "notes" | "worksheets" | "test-yourself";
  lockedCount?: number;
};

function lockedLabel(variant: ResourceFreemiumBannerProps["variant"], count: number) {
  if (count <= 0) return null;
  const noun =
    variant === "notes"
      ? `note${count === 1 ? "" : "s"}`
      : variant === "worksheets"
        ? `worksheet${count === 1 ? "" : "s"}`
        : `question${count === 1 ? "" : "s"}`;
  return `${count} batch-gated ${noun} locked`;
}

export function ResourceFreemiumBanner({
  access,
  context,
  variant,
  lockedCount = 0,
}: ResourceFreemiumBannerProps) {
  const enrollCta =
    context === "public" ? (
      <>
        {" "}
        <Link href="/enroll" className="font-medium underline">
          Enroll in a batch
        </Link>{" "}
        or{" "}
        <Link href="/login" className="font-medium underline">
          sign in
        </Link>{" "}
        if you already have access.
      </>
    ) : (
      <>
        {" "}
        <Link href="/student/courses" className="font-medium underline">
          View your batches
        </Link>{" "}
        or enroll from the{" "}
        <Link href="/enroll" className="font-medium underline">
          enroll page
        </Link>
        .
      </>
    );

  if (access.fullAccess) {
    return (
      <div className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-950 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-100">
        <LuSparkles className="h-4 w-4 shrink-0" />
        <p>
          {variant === "test-yourself"
            ? "Full access — all questions in each topic are available."
            : "Full access — batch-gated downloads are unlocked."}
        </p>
      </div>
    );
  }

  const lockedHint = lockedLabel(variant, lockedCount);

  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
      <LuLock className="mt-0.5 h-4 w-4 shrink-0" />
      <p>
        {variant === "test-yourself" ? (
          <>
            Try practice questions for free. Enroll in a batch to unlock the full question
            set per topic.
            {enrollCta}
          </>
        ) : (
          <>
            Public {variant === "notes" ? "notes" : "worksheets"} are free to
            download. Course-gated items require enrollment.
            {lockedHint ? ` ${lockedHint}.` : null}
            {enrollCta}
          </>
        )}
      </p>
    </div>
  );
}

import InAppNotification from "@/models/InAppNotification";
import { toObjectId } from "@/app/api/_lib/phase12";

type RenewalNoticeCandidate = {
  kind: "course" | "batch";
  id: string;
  title: string;
  periodKey: string;
  warningUntil?: string;
  phase: "grace" | "expired";
};

function renewalDedupeKey(
  studentId: string,
  item: Pick<RenewalNoticeCandidate, "kind" | "id" | "periodKey">,
): string {
  return `payment_renewal_due:${studentId}:${item.kind}:${item.id}:${item.periodKey}`;
}

/**
 * Creates at most one in-app notice per student + entity + billing period
 * when a monthly plan enters the post-month warning window.
 * Uses upsert + unique dedupeKey so parallel dashboard loads cannot race.
 */
export async function ensureMonthlyRenewalNotices(
  studentId: string,
  candidates: RenewalNoticeCandidate[],
): Promise<number> {
  if (candidates.length === 0) return 0;
  const userOid = toObjectId(studentId);
  if (!userOid) return 0;

  let created = 0;
  for (const item of candidates) {
    const dedupeKey = renewalDedupeKey(studentId, item);

    const until = item.warningUntil
      ? new Date(item.warningUntil).toLocaleDateString(undefined, {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : null;

    const title =
      item.phase === "grace"
        ? `Monthly fee due — ${item.title}`
        : `Access paused — pay to renew ${item.title}`;

    const message =
      item.phase === "grace"
        ? `Your paid month has ended. Please pay this month’s fee before ${until || "the grace period ends"} to keep uninterrupted access (15-day extension).`
        : `Your 15-day extension has ended. Pay the monthly fee to restore access to “${item.title}”. Your instructor may grant 7 extra days if needed.`;

    try {
      const result = await InAppNotification.updateOne(
        { dedupeKey },
        {
          $setOnInsert: {
            userId: userOid,
            type: "payment_renewal_due",
            title,
            message,
            dedupeKey,
            metadata: {
              entityKind: item.kind,
              entityId: item.id,
              periodKey: item.periodKey,
              phase: item.phase,
              warningUntil: item.warningUntil,
              href: "/student/payments",
              severity: "warning",
            },
            isRead: false,
          },
        },
        { upsert: true },
      );
      if (result.upsertedCount > 0) created += 1;
    } catch (err) {
      // Concurrent upserts hit the unique index — treat as already created.
      const code = (err as { code?: number })?.code;
      if (code !== 11000) throw err;
    }
  }
  return created;
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { AcademicListEmpty, AcademicListItem } from '@/components/academic-hub/AcademicListItem';
import { formatTimeAgo } from '@/components/academic-hub/academicHubUtils';
import { categoryLabel, audienceScopeLabel } from '@/components/notices/noticeUiUtils';
import { noticesService } from '@/services/noticesService';
import { notificationsService } from '@/services/notificationsService';
import { duePaymentsService } from '@/services/enrollmentRequestsService';
import type { NoticeRow } from '@/types/notice';
import type { InAppNotificationRow } from '@/types/inAppNotification';
import { LuMegaphone, LuTriangleAlert } from 'react-icons/lu';

function noticeIconClass(category: string) {
  switch (category) {
    case 'admin':
      return 'text-blue-600 bg-blue-100';
    case 'subject':
      return 'text-emerald-600 bg-emerald-100';
    case 'teacher':
      return 'text-violet-600 bg-violet-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
}

export function NoticeBoardSection({
  maxItems,
  compact = false,
}: {
  maxItems?: number;
  compact?: boolean;
}) {
  const [notices, setNotices] = useState<NoticeRow[]>([]);
  const [paymentNotices, setPaymentNotices] = useState<InAppNotificationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const limit = maxItems ?? (compact ? 3 : 20);
      // Ensure renewal notices exist, then load notice board + payment alerts.
      await duePaymentsService.list().catch(() => null);
      const [{ notices: rows }, paymentFeed] = await Promise.all([
        noticesService.list(`limit=${limit}&page=1&isActive=true`),
        notificationsService.list({
          type: 'payment_renewal_due',
          limit: Math.max(limit, 10),
        }),
      ]);
      setNotices(rows);
      setPaymentNotices(paymentFeed.notifications);
    } finally {
      setLoading(false);
    }
  }, [compact, maxItems]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleMarkPaymentRead = async (id: string) => {
    await notificationsService.markRead(id);
    setPaymentNotices((prev) =>
      prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)),
    );
  };

  if (loading) {
    return <p className="text-sm text-gray-500">Loading…</p>;
  }

  const paymentSlots = Math.min(paymentNotices.length, maxItems ?? paymentNotices.length);
  const academicLimit = maxItems
    ? Math.max(0, maxItems - paymentSlots)
    : notices.length;
  const paymentRows = paymentNotices.slice(0, paymentSlots);
  const academicRows = notices.slice(0, academicLimit);

  if (paymentRows.length === 0 && academicRows.length === 0) {
    return <AcademicListEmpty message="No announcements yet." icon={LuMegaphone} />;
  }

  return (
    <ul className="space-y-1">
      {paymentRows.map((item) => {
        const payHref =
          typeof item.metadata?.href === 'string'
            ? item.metadata.href
            : '/student/payments';
        return (
          <li key={`pay-${item._id}`}>
            <AcademicListItem
              icon={LuTriangleAlert}
              iconClassName="text-amber-700 bg-amber-100"
              title={item.title}
              subtitle={item.message}
              meta={`Payments · ${formatTimeAgo(item.createdAt)}`}
              unread={!item.isRead}
              onClick={() => {
                if (!item.isRead) void handleMarkPaymentRead(item._id);
              }}
              accentClassName="border-l-2 border-l-amber-500 bg-amber-50/60 pl-2"
              trailing={
                <div className="flex flex-col items-end gap-1">
                  <Badge
                    variant="outline"
                    className="border-amber-300 bg-amber-50 text-[10px] px-1.5 py-0 text-amber-800"
                  >
                    Payment
                  </Badge>
                  <Link
                    href={payHref}
                    className="text-[10px] font-semibold text-amber-800 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Pay
                  </Link>
                </div>
              }
            />
          </li>
        );
      })}
      {academicRows.map((notice) => {
        const scopeLabel = audienceScopeLabel(notice);
        return (
          <li key={notice._id}>
            <AcademicListItem
              icon={LuMegaphone}
              iconClassName={noticeIconClass(notice.category)}
              title={notice.title}
              subtitle={notice.body}
              meta={`${notice.postedBy.name}${notice.subject ? ` · ${notice.subject}` : ''}${scopeLabel ? ` · ${scopeLabel}` : ''} · ${formatTimeAgo(notice.createdAt)}`}
              unread={notice.isPinned}
              trailing={
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {categoryLabel(notice.category)}
                </Badge>
              }
            />
          </li>
        );
      })}
    </ul>
  );
}

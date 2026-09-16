'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { AcademicListEmpty, AcademicListItem } from '@/components/academic-hub/AcademicListItem';
import { formatTimeAgo } from '@/components/academic-hub/academicHubUtils';
import { batchDeepLink } from '@/components/academic-hub/batchDeepLink';
import { notificationsService } from '@/services/notificationsService';
import type { InAppNotificationRow } from '@/types/inAppNotification';
import { LuCalendarClock } from 'react-icons/lu';

const SCHEDULE_EXCLUDE = 'payment_renewal_due';

export function ScheduleUpdatesSection({
  maxItems,
  batchesHref = '/student/courses',
  compact = false,
  showActions = true,
}: {
  maxItems?: number;
  batchesHref?: string;
  compact?: boolean;
  showActions?: boolean;
}) {
  const [items, setItems] = useState<InAppNotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const limit = maxItems ?? (compact ? 3 : 20);
      const { notifications, unreadCount: count } =
        await notificationsService.list({
          limit,
          excludeType: SCHEDULE_EXCLUDE,
        });
      setItems(notifications);
      setUnreadCount(count);
    } finally {
      setLoading(false);
    }
  }, [compact, maxItems]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleMarkRead = async (id: string) => {
    await notificationsService.markRead(id);
    setItems((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const handleMarkAllRead = async () => {
    await notificationsService.markAllRead();
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  if (loading) {
    return <p className="text-sm text-gray-500">Loading…</p>;
  }

  const rows = maxItems ? items.slice(0, maxItems) : items;

  if (rows.length === 0) {
    return (
      <AcademicListEmpty message="No schedule changes yet." icon={LuCalendarClock} />
    );
  }

  return (
    <div className="space-y-2">
      {showActions && unreadCount > 0 ? (
        <div className="flex justify-end pb-1">
          <Button type="button" size="sm" variant="outline" onClick={handleMarkAllRead}>
            Mark all read
          </Button>
        </div>
      ) : null}
      <ul className="space-y-1">
        {rows.map((item) => (
          <li key={item._id}>
            <AcademicListItem
              icon={LuCalendarClock}
              iconClassName={
                item.isRead
                  ? 'text-gray-500 bg-gray-100'
                  : 'text-amber-600 bg-amber-100'
              }
              title={item.title}
              subtitle={item.message}
              meta={formatTimeAgo(item.createdAt)}
              unread={!item.isRead}
              onClick={() => {
                if (!item.isRead) void handleMarkRead(item._id);
              }}
              accentClassName={!item.isRead ? 'border-l-2 border-l-primary pl-2' : ''}
              trailing={
                item.batchId ? (
                  <Link
                    href={batchDeepLink(batchesHref, item.batchId)}
                    className="text-[10px] font-medium text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Open
                  </Link>
                ) : undefined
              }
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function useScheduleUnreadCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    void notificationsService
      .list({ limit: 1, excludeType: SCHEDULE_EXCLUDE })
      .then(({ unreadCount }) => {
        setCount(unreadCount);
      });
  }, []);
  return count;
}

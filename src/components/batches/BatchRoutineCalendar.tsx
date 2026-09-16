'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import {
  batchesService,
  type BatchCalendarEvent,
} from '@/services/batchesService';
import {
  addMonths,
  format,
  isSameDay,
  isSameMonth,
  startOfMonth,
  startOfWeek,
  addDays,
  endOfWeek,
  endOfMonth,
  isToday,
  startOfDay,
} from 'date-fns';
import {
  LuCalendar as CalendarIcon,
  LuChevronLeft,
  LuChevronRight,
  LuPanelRightClose,
  LuPanelRightOpen,
} from 'react-icons/lu';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

const TYPE_LABELS: Record<BatchCalendarEvent['type'], string> = {
  live_class: 'Live class',
  assignment: 'Assignment',
  exam: 'Test',
  batch: 'Batch',
};

const DESKTOP_PAGE_SIZE = 5;
const MOBILE_PAGE_SIZE = 7;
const COLLAPSED_WIDTH = 'w-12';
const EXPANDED_WIDTH = 'w-[min(100%,300px)] sm:w-[320px]';
const DESKTOP_WIDTH = 'lg:w-[340px]';

function useSchedulePageSize() {
  const [pageSize, setPageSize] = useState(DESKTOP_PAGE_SIZE);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const update = () => setPageSize(mq.matches ? MOBILE_PAGE_SIZE : DESKTOP_PAGE_SIZE);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  return pageSize;
}

function buildWeeks(viewDate: Date) {
  const monthStart = startOfMonth(viewDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(endOfMonth(monthStart), { weekStartsOn: 0 });
  const weeks: Date[][] = [];
  let cursor = gridStart;
  while (cursor <= gridEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(cursor);
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }
  return { weeks, monthStart };
}

function formatEventTime(event: BatchCalendarEvent) {
  if (event.allDay) return 'All day';
  return format(new Date(event.start), 'HH:mm');
}

function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace('#', '');
  if (h.length !== 6) return `rgba(148, 163, 184, ${alpha})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function DateBadge({
  date,
  color,
  compact = false,
}: {
  date: Date;
  color: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex shrink-0 flex-col items-center justify-center rounded-lg text-white shadow-md',
        compact ? 'h-9 w-9' : 'h-11 w-11',
      )}
      style={{ backgroundColor: color }}
    >
      <span
        className={cn(
          'font-bold uppercase leading-none tracking-wide',
          compact ? 'text-[7px]' : 'text-[9px]',
        )}
      >
        {format(date, 'EEE')}
      </span>
      <span
        className={cn('font-bold leading-none', compact ? 'mt-0.5 text-xs' : 'mt-0.5 text-base')}
      >
        {format(date, 'd')}
      </span>
    </div>
  );
}

function ScheduleRow({
  event,
  drawerOpen,
  compact,
}: {
  event: BatchCalendarEvent;
  drawerOpen: boolean;
  compact: boolean;
}) {
  const eventDate = new Date(event.start);

  return (
    <div className="flex min-h-0 w-full flex-1 items-center gap-2">
      <DateBadge date={eventDate} color={event.color} compact={compact} />

      <div
        className={cn(
          'min-w-0 overflow-hidden transition-all duration-300 ease-in-out',
          drawerOpen ? 'flex-1 opacity-100' : 'w-0 flex-none opacity-0',
        )}
      >
        <div
          className={cn(
            'flex flex-col justify-between rounded-xl border border-white/40 px-3 py-2 text-slate-800',
            compact ? 'min-h-[52px]' : 'min-h-[60px]',
          )}
          style={{ backgroundColor: hexToRgba(event.color, 0.6) }}
        >
          <div className="flex items-start justify-between gap-1.5">
            <p className={cn('truncate font-semibold leading-tight', compact ? 'text-xs' : 'text-sm')}>
              {event.title}
            </p>
            <span className="shrink-0 text-[9px] font-medium text-slate-600">
              {TYPE_LABELS[event.type]}
            </span>
          </div>
          <div className="flex items-end justify-between gap-1">
            <span className={cn('font-medium text-slate-700', compact ? 'text-[10px]' : 'text-xs')}>
              {formatEventTime(event)}
            </span>
            {event.end && !event.allDay && (
              <span className="text-[9px] text-slate-600">
                {format(new Date(event.end), 'HH:mm')}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function BatchRoutineCalendar({ batchId }: { batchId: string }) {
  const pageSize = useSchedulePageSize();
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [events, setEvents] = useState<BatchCalendarEvent[]>([]);
  const [label, setLabel] = useState('');
  const [loading, setLoading] = useState(true);
  const [scheduleStartIdx, setScheduleStartIdx] = useState(0);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth() + 1;
  const isMobileLayout = pageSize === MOBILE_PAGE_SIZE;
  const drawerOpen = isMobileLayout ? mobileDrawerOpen : true;

  const load = useCallback(async () => {
    setLoading(true);
    const res = await batchesService.getCalendar(batchId, year, month);
    if (res.success && res.data) {
      setEvents(res.data.events);
      setLabel(res.data.label);
    }
    setLoading(false);
  }, [batchId, year, month]);

  useEffect(() => {
    load();
  }, [load]);

  const { weeks, monthStart } = useMemo(() => buildWeeks(viewDate), [viewDate]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, BatchCalendarEvent[]>();
    for (const e of events) {
      const key = format(new Date(e.start), 'yyyy-MM-dd');
      const list = map.get(key) ?? [];
      list.push(e);
      map.set(key, list);
    }
    for (const [, list] of map) {
      list.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    }
    return map;
  }, [events]);

  const monthEvents = useMemo(() => {
    const monthStartDate = startOfMonth(viewDate);
    const monthEndDate = endOfMonth(viewDate);
    return events
      .filter((e) => {
        const d = new Date(e.start);
        return d >= monthStartDate && d <= monthEndDate;
      })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  }, [events, viewDate]);

  const todayAnchorIdx = useMemo(() => {
    if (monthEvents.length === 0) return 0;
    const todayStart = startOfDay(new Date());
    const idx = monthEvents.findIndex((e) => new Date(e.start) >= todayStart);
    return idx === -1 ? monthEvents.length : idx;
  }, [monthEvents]);

  useEffect(() => {
    setScheduleStartIdx(todayAnchorIdx);
    const now = new Date();
    if (isSameMonth(viewDate, now)) {
      setSelectedDate(now);
    } else {
      setSelectedDate(startOfMonth(viewDate));
    }
  }, [viewDate, todayAnchorIdx]);

  useEffect(() => {
    setScheduleStartIdx((idx) =>
      Math.min(idx, Math.max(0, monthEvents.length - pageSize)),
    );
  }, [pageSize, monthEvents.length]);

  const pagedEvents = monthEvents.slice(scheduleStartIdx, scheduleStartIdx + pageSize);

  const canGoPrev = scheduleStartIdx > 0;
  const canGoNext = scheduleStartIdx + pageSize < monthEvents.length;

  const years = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, i) => current - 2 + i);
  }, []);

  const slots = Array.from({ length: pageSize }, (_, i) => pagedEvents[i] ?? null);

  function goPrev() {
    setScheduleStartIdx((idx) => Math.max(0, idx - pageSize));
  }

  function goNext() {
    setScheduleStartIdx((idx) =>
      Math.min(Math.max(0, monthEvents.length - pageSize), idx + pageSize),
    );
  }

  const mobileDrawerProps = {
    drawerOpen,
    compact: true as const,
    slots,
    loading,
    monthEvents,
    label,
    viewDate,
    canGoPrev,
    canGoNext,
    onPrev: goPrev,
    onNext: goNext,
    onToggle: () => setMobileDrawerOpen((o) => !o),
    showToggle: true as const,
  };

  return (
    <div className="relative">
      <div className="flex items-stretch gap-2 lg:gap-4">
        {/* Calendar — left, shares row with collapsed bar on mobile */}
        <div className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <select
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800"
                value={month - 1}
                onChange={(e) => {
                  const m = Number(e.target.value);
                  setViewDate(new Date(year, m, 1));
                }}
              >
                {MONTH_NAMES.map((name, i) => (
                  <option key={name} value={i}>
                    {name}
                  </option>
                ))}
              </select>
              <select
                className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800"
                value={year}
                onChange={(e) => {
                  const y = Number(e.target.value);
                  setViewDate(new Date(y, month - 1, 1));
                }}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-lg"
                onClick={() => setViewDate((d) => addMonths(d, -1))}
              >
                <LuChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-lg"
                onClick={() => {
                  const now = new Date();
                  setViewDate(now);
                  setSelectedDate(now);
                  setScheduleStartIdx(todayAnchorIdx);
                }}
              >
                Today
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-lg"
                onClick={() => setViewDate((d) => addMonths(d, 1))}
              >
                <LuChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">Loading calendar…</p>
          ) : (
            <>
              <div className="mb-2 grid grid-cols-7 gap-1.5 text-center text-xs font-semibold uppercase tracking-wide text-slate-400 sm:gap-2">
                {WEEKDAYS.map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {weeks.flat().map((day) => {
                  const key = format(day, 'yyyy-MM-dd');
                  const dayEvents = eventsByDay.get(key) ?? [];
                  const inMonth = isSameMonth(day, monthStart);
                  const today = isToday(day);
                  const selected = isSameDay(day, selectedDate);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedDate(day)}
                      className={cn(
                        'flex min-h-[68px] flex-col rounded-xl border p-1.5 text-left transition-colors sm:min-h-[80px] sm:p-2',
                        inMonth
                          ? 'border-slate-200 bg-slate-50/50'
                          : 'border-transparent bg-slate-100/40',
                        today && 'bg-blue-50 ring-2 ring-blue-200',
                        selected && 'border-dashed border-blue-500 ring-1 ring-blue-300',
                        !inMonth && 'text-slate-400',
                      )}
                    >
                      <span
                        className={cn(
                          'text-sm font-semibold',
                          today ? 'text-blue-700' : 'text-slate-800',
                        )}
                      >
                        {format(day, 'd')}
                      </span>
                      <div className="mt-auto space-y-0.5">
                        {dayEvents.slice(0, 2).map((e) => (
                          <div
                            key={e.id}
                            className="flex items-center gap-1 truncate text-[10px] text-slate-600"
                          >
                            <span
                              className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                              style={{ backgroundColor: e.color }}
                            />
                            <span className="truncate">{e.title}</span>
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <span className="text-[10px] text-slate-400">
                            +{dayEvents.length - 2} more
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Mobile collapsed bar — in flow beside calendar, always reserves w-12 */}
        <div
          className={cn(
            'flex shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-sm lg:hidden',
            COLLAPSED_WIDTH,
            mobileDrawerOpen && 'pointer-events-none invisible',
          )}
        >
          <ScheduleDrawerContent {...mobileDrawerProps} drawerOpen={false} />
        </div>

        {/* Desktop schedule — right of calendar */}
        <div
          className={cn(
            'hidden min-h-0 shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-sm lg:flex',
            DESKTOP_WIDTH,
          )}
        >
          <ScheduleDrawerContent
            drawerOpen
            compact={false}
            slots={slots}
            loading={loading}
            monthEvents={monthEvents}
            label={label}
            viewDate={viewDate}
            canGoPrev={canGoPrev}
            canGoNext={canGoNext}
            onPrev={goPrev}
            onNext={goNext}
            onToggle={() => undefined}
            showToggle={false}
          />
        </div>
      </div>

      {/* Mobile expanded drawer — grows left over calendar, calendar width unchanged */}
      {mobileDrawerOpen && (
        <div
          className={cn(
            'absolute bottom-0 right-0 top-0 z-10 flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white/95 shadow-lg transition-[width] duration-300 ease-in-out lg:hidden',
            EXPANDED_WIDTH,
          )}
        >
          <ScheduleDrawerContent {...mobileDrawerProps} drawerOpen />
        </div>
      )}
    </div>
  );
}

function ScheduleDrawerContent({
  drawerOpen,
  compact,
  slots,
  loading,
  monthEvents,
  label,
  viewDate,
  canGoPrev,
  canGoNext,
  onPrev,
  onNext,
  onToggle,
  showToggle,
}: {
  drawerOpen: boolean;
  compact: boolean;
  slots: (BatchCalendarEvent | null)[];
  loading: boolean;
  monthEvents: BatchCalendarEvent[];
  label: string;
  viewDate: Date;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToggle: () => void;
  showToggle: boolean;
}) {
  return (
    <>
      <div
        className={cn(
          'flex shrink-0 items-center border-b border-slate-200',
          drawerOpen ? 'justify-between gap-2 px-3 py-2.5' : 'flex-col py-2',
        )}
      >
        {drawerOpen ? (
          <>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                <CalendarIcon className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate">Scheduled</span>
              </div>
              <p className="truncate text-xs text-slate-500">
                {label || format(viewDate, 'MMMM yyyy')}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-0.5">
              {showToggle && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onToggle}
                  aria-label="Collapse schedule"
                >
                  <LuPanelRightClose className="h-4 w-4" />
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={!canGoPrev}
                onClick={onPrev}
              >
                <LuChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={!canGoNext}
                onClick={onNext}
              >
                <LuChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onToggle}
            aria-label="Expand schedule"
          >
            <LuPanelRightOpen className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div
        className={cn(
          'flex min-h-0 flex-1 flex-col overflow-hidden',
          drawerOpen ? 'gap-2 p-2.5' : 'gap-1.5 p-1',
        )}
      >
        {loading ? (
          <p className="text-xs text-slate-500">Loading…</p>
        ) : monthEvents.length === 0 ? (
          <p className={cn('text-slate-500', compact ? 'text-[10px]' : 'text-xs')}>
            No events
          </p>
        ) : (
          slots.map((event, i) => (
            <div
              key={event?.id ?? `slot-${i}`}
              className={cn('flex w-full min-h-0 flex-1', !event && 'invisible')}
            >
              {event && (
                <ScheduleRow event={event} drawerOpen={drawerOpen} compact={compact} />
              )}
            </div>
          ))
        )}
      </div>

      {!drawerOpen && (
        <div className="flex shrink-0 flex-col items-center gap-0.5 border-t border-slate-200 py-1.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={!canGoPrev}
            onClick={onPrev}
          >
            <LuChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            disabled={!canGoNext}
            onClick={onNext}
          >
            <LuChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </>
  );
}

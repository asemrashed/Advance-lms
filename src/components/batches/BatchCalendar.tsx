'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
} from 'date-fns';
import { LuChevronLeft, LuChevronRight } from 'react-icons/lu';

const LEGEND = [
  { type: 'live_class', label: 'Live class', color: '#7c3aed' },
  { type: 'assignment', label: 'Assignment', color: '#2563eb' },
  { type: 'exam', label: 'Exam', color: '#ea580c' },
  { type: 'batch', label: 'Batch', color: '#059669' },
] as const;

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

export function BatchCalendar({ batchId }: { batchId: string }) {
  const [viewDate, setViewDate] = useState(() => new Date());
  const [events, setEvents] = useState<BatchCalendarEvent[]>([]);
  const [label, setLabel] = useState('');
  const [loading, setLoading] = useState(true);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth() + 1;

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
      const list = map.get(key) || [];
      list.push(e);
      map.set(key, list);
    }
    return map;
  }, [events]);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 py-4">
        <CardTitle className="text-base">{label || 'Calendar'}</CardTitle>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setViewDate((d) => addMonths(d, -1))}
          >
            <LuChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setViewDate(new Date())}
          >
            Today
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setViewDate((d) => addMonths(d, 1))}
          >
            <LuChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3 text-xs">
          {LEGEND.map((item) => (
            <span key={item.type} className="flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              {item.label}
            </span>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading calendar…</p>
        ) : (
          <>
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {weeks.flat().map((day) => {
                const key = format(day, 'yyyy-MM-dd');
                const dayEvents = eventsByDay.get(key) || [];
                const inMonth = isSameMonth(day, monthStart);
                const isToday = isSameDay(day, new Date());
                return (
                  <div
                    key={key}
                    className={`min-h-[88px] rounded-md border p-1 text-left ${
                      inMonth ? 'bg-background' : 'bg-muted/30 text-muted-foreground'
                    } ${isToday ? 'ring-2 ring-primary/40' : ''}`}
                  >
                    <div className="text-xs font-medium">{format(day, 'd')}</div>
                    <div className="mt-0.5 space-y-0.5">
                      {dayEvents.slice(0, 3).map((e) => (
                        <div
                          key={e.id}
                          className="truncate rounded px-0.5 text-[10px] leading-tight text-white"
                          style={{ backgroundColor: e.color }}
                          title={e.title}
                        >
                          {e.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-[10px] text-muted-foreground">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

import type { BatchScheduleSlot } from '@/services/batchesService';

export const WEEKDAY_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export function toDateInputValue(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

export function toDatetimeLocalValue(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function emptyLiveClassForm() {
  return {
    title: '',
    scheduledAt: '',
    durationMinutes: '60',
    meetLink: '',
    recordingUrl: '',
    type: 'live' as 'live' | 'recorded',
    recurrence: 'once' as 'once' | 'weekly' | 'monthly',
  };
}

export function liveClassToForm(lc: {
  title: string;
  scheduledAt: string;
  durationMinutes: number;
  meetLink?: string;
  recordingUrl?: string;
  type: 'live' | 'recorded';
  recurrence?: 'once' | 'weekly' | 'monthly';
}) {
  return {
    title: lc.title,
    scheduledAt: toDatetimeLocalValue(lc.scheduledAt),
    durationMinutes: String(lc.durationMinutes),
    meetLink: lc.meetLink ?? '',
    recordingUrl: lc.recordingUrl ?? '',
    type: lc.type,
    recurrence: lc.recurrence ?? 'once',
  };
}

export function newRoutineSlot(dayOfWeek = 1): BatchScheduleSlot {
  return {
    dayOfWeek: dayOfWeek as BatchScheduleSlot['dayOfWeek'],
    startTime: '18:00',
    endTime: '19:30',
    title: '',
  };
}

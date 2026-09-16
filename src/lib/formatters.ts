import { format, formatDistanceToNow } from 'date-fns';
import { formatBdt } from '@/lib/currency';
import { safeDate } from '@/lib/safe';

export const formatDate = (value: Date | string | number | null | undefined, fallback = 'N/A') => {
  const parsed = safeDate(value);
  if (!parsed) return fallback;
  return format(parsed, 'MMM dd, yyyy');
};

export const formatDateTime = (
  value: Date | string | number | null | undefined,
  fallback = 'N/A'
) => {
  const parsed = safeDate(value);
  if (!parsed) return fallback;
  return format(parsed, 'MMM dd, yyyy hh:mm a');
};

export const formatTimeAgo = (
  value: Date | string | number | null | undefined,
  fallback = 'N/A'
) => {
  const parsed = safeDate(value);
  if (!parsed) return fallback;
  return formatDistanceToNow(parsed, { addSuffix: true });
};

export const formatCurrency = (amount: number) => formatBdt(amount);

export const formatDuration = (totalMinutes: number) => {
  if (!Number.isFinite(totalMinutes) || totalMinutes < 0) return '0m';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.floor(totalMinutes % 60);
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
};

export const getInitials = (name = '') => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  if (parts.length === 1) {
    const ch = parts[0].charAt(0).toUpperCase();
    return ch ? `${ch}${ch}` : '??';
  }
  const first = parts[0].charAt(0);
  const last = parts[parts.length - 1].charAt(0);
  const initials = `${first}${last}`.toUpperCase();
  return initials || '??';
};

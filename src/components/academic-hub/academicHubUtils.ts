export function formatTimeAgo(iso: string) {
  if (!iso?.trim()) return 'N/A';
  const time = new Date(iso);
  if (Number.isNaN(time.getTime())) return 'Invalid date';
  const diffMin = Math.floor((Date.now() - time.getTime()) / 60000);
  if (diffMin < 0) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`;
  return `${Math.floor(diffMin / 1440)}d ago`;
}

export function formatShortDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

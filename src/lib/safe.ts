export const safeText = (value: unknown, fallback = 'N/A'): string => {
  if (value == null) return fallback;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    const normalized = value
      .map((item) => safeText(item, ''))
      .filter((item) => item.length > 0)
      .join(', ');
    return normalized || fallback;
  }
  if (typeof value === 'object') {
    const candidate = value as Record<string, unknown>;
    for (const key of ['name', 'title', 'label', 'text', 'value']) {
      const entry = candidate[key];
      if (typeof entry === 'string' || typeof entry === 'number' || typeof entry === 'boolean') {
        return String(entry);
      }
    }
  }
  return fallback;
};

export const safeDate = (value: unknown): Date | null => {
  if (value == null || value === '') return null;
  const date = value instanceof Date ? value : new Date(value as string | number);
  return Number.isNaN(date.getTime()) ? null : date;
};

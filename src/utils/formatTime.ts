import dayjs from 'dayjs';

/** "HH:mm" or "HH:mm:ss" -> "h:mm A", e.g. "14:30" -> "2:30 PM". */
export const formatTime12h = (value: string | null | undefined): string => {
  if (!value) return '';
  const parsed = dayjs(value, ['HH:mm:ss', 'HH:mm']);
  return parsed.isValid() ? parsed.format('h:mm A') : value;
};

/** Minutes -> "Xh Ym", e.g. 90 -> "1h 30m". Drops a zero part. */
export const formatDurationMinutes = (minutes: number | null | undefined): string => {
  if (minutes == null) return '';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

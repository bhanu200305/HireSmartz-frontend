import dayjs from 'dayjs';

/** "HH:mm" or "HH:mm:ss" -> "h:mm A", e.g. "14:30" -> "2:30 PM". */
export const formatTime12h = (value: string | null | undefined): string => {
  if (!value) return '';
  const parsed = dayjs(value, ['HH:mm:ss', 'HH:mm']);
  return parsed.isValid() ? parsed.format('h:mm A') : value;
};

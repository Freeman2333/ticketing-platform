type DateTimeFormat = 'full' | 'medium';

const FORMATS: Record<DateTimeFormat, Intl.DateTimeFormatOptions> = {
  full: { dateStyle: 'full', timeStyle: 'short' },
  medium: { dateStyle: 'medium' },
};

export function formatDateTime(date: Date | string, format: DateTimeFormat = 'full') {
  return new Date(date).toLocaleString(undefined, FORMATS[format]);
}

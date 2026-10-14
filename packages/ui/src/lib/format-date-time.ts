type DateTimeFormat = 'full';

const FORMATS: Record<DateTimeFormat, Intl.DateTimeFormatOptions> = {
  full: { dateStyle: 'full', timeStyle: 'short' },
};

export function formatDateTime(date: Date | string, format: DateTimeFormat = 'full') {
  return new Date(date).toLocaleString(undefined, FORMATS[format]);
}

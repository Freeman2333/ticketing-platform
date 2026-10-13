const LABEL_PATTERN = /^(.*?)(\d+)$/;

export function parseSeatLabel(label: string): { row: string; number: string } {
  const match = LABEL_PATTERN.exec(label);
  if (!match) return { row: label, number: '' };
  return { row: match[1], number: match[2] };
}

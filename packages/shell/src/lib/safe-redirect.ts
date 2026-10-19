export function getSafeRedirect(value: string | null): string {
  if (!value || !/^\/(?!\/|\\)/.test(value)) return '/';
  return value;
}

export async function paginate<T>(
  fetch: (skip: number, take: number) => Promise<T[]>,
  page: number,
  limit: number,
): Promise<{ items: T[]; hasMore: boolean }> {
  const rows = await fetch((page - 1) * limit, limit + 1);
  const hasMore = rows.length > limit;
  return { items: hasMore ? rows.slice(0, limit) : rows, hasMore };
}

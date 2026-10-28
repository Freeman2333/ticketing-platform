import { paginate } from './paginate';

describe('paginate', () => {
  it('calls fetch with skip/take derived from page and limit', async () => {
    const fetch = jest.fn().mockResolvedValue([]);

    await paginate(fetch, 3, 10);

    expect(fetch).toHaveBeenCalledWith(20, 11);
  });

  it('reports hasMore: false and returns all rows when fewer than limit+1 come back', async () => {
    const rows = [1, 2, 3];
    const fetch = jest.fn().mockResolvedValue(rows);

    const result = await paginate(fetch, 1, 10);

    expect(result).toEqual({ items: rows, hasMore: false });
  });

  it('reports hasMore: true and trims the extra row when limit+1 come back', async () => {
    const rows = Array.from({ length: 11 }, (_, i) => i);
    const fetch = jest.fn().mockResolvedValue(rows);

    const result = await paginate(fetch, 1, 10);

    expect(result.hasMore).toBe(true);
    expect(result.items).toEqual(rows.slice(0, 10));
  });
});

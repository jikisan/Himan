import { describe, it, expect } from 'vitest';
import { sortByPosition } from '@himan/shared/profile';

interface Item {
  id: string;
  position: number;
  createdAt: Date;
}

describe('sortByPosition', () => {
  it('sorts by position ascending', () => {
    const items: Item[] = [
      { id: 'b', position: 1, createdAt: new Date('2026-01-01') },
      { id: 'a', position: 0, createdAt: new Date('2026-01-01') },
    ];

    expect(sortByPosition(items).map((i) => i.id)).toEqual(['a', 'b']);
  });

  it('ties break on createdAt ascending', () => {
    const items: Item[] = [
      { id: 'later', position: 0, createdAt: new Date('2026-02-01') },
      { id: 'earlier', position: 0, createdAt: new Date('2026-01-01') },
    ];

    expect(sortByPosition(items).map((i) => i.id)).toEqual(['earlier', 'later']);
  });

  it('does not mutate the input array', () => {
    const items: Item[] = [{ id: 'a', position: 1, createdAt: new Date() }];
    const result = sortByPosition(items);
    expect(result).not.toBe(items);
  });
});

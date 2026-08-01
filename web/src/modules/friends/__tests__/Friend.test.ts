import { describe, it, expect } from 'vitest';
import { mapFriendRow } from '@himan/shared/friends';
import type { FriendRowType } from '@himan/shared/friends';

const row: FriendRowType = {
  id: 'f1',
  requester_id: 'A',
  addressee_id: 'B',
  requester_email: 'a@example.com',
  addressee_email: 'b@example.com',
  status: 'pending',
  created_at: '2026-08-01T00:00:00.000Z',
};

describe('mapFriendRow', () => {
  it('marks outgoing and picks the addressee when I am the requester', () => {
    const f = mapFriendRow(row, 'A');
    expect(f.direction).toBe('outgoing');
    expect(f.userId).toBe('B');
    expect(f.email).toBe('b@example.com');
    expect(f.createdAt).toBeInstanceOf(Date);
  });

  it('marks incoming and picks the requester when I am the addressee', () => {
    const f = mapFriendRow(row, 'B');
    expect(f.direction).toBe('incoming');
    expect(f.userId).toBe('A');
    expect(f.email).toBe('a@example.com');
  });
});

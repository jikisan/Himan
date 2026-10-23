import { describe, expect, it } from 'vitest';
import { dateStatus, expiringSoon, filterReceipts, fitPhoto, normalizeTags, receiptAttention, receiptSchema, statusLabel,
  tagCounts } from '@himan/shared/receipts';

const today = '2026-10-24';
const base = { merchant: 'Store', amount: 10, purchasedOn: '2026-10-01', note: '', tags: [] as string[], warrantyEndsOn: null, expiresOn: null };

describe('dateStatus', () => {
  it.each([
    [null, 'none', 0], ['2026-10-23', 'expired', -1], ['2026-10-24', 'today', 0],
    ['2026-10-25', 'soon', 1], ['2026-11-23', 'soon', 30], ['2026-11-24', 'ok', 31],
  ])('%s is %s', (date, kind, days) => expect(dateStatus(date, today)).toEqual({ kind, days }));
  it('counts calendar days across a month and a leap day', () => {
    expect(dateStatus('2028-03-01', '2028-02-28').days).toBe(2);
  });
});

describe('receiptAttention', () => {
  it('prefers the nearest upcoming date over a past one', () => {
    expect(receiptAttention({ warrantyEndsOn: '2026-01-01', expiresOn: '2026-12-01' }, today)!.what).toBe('Expiry');
  });
  it('falls back to the most recent past date and says so in words', () => {
    const a = receiptAttention({ warrantyEndsOn: '2026-10-20', expiresOn: '2026-01-01' }, today)!;
    expect(statusLabel(a)).toBe('Warranty ended 4 days ago');
  });
  it('is null with no dates and words singular and today correctly', () => {
    expect(receiptAttention({ warrantyEndsOn: null, expiresOn: null }, today)).toBeNull();
    expect(statusLabel(receiptAttention({ warrantyEndsOn: today, expiresOn: null }, today)!)).toBe('Warranty ends today');
    expect(statusLabel(receiptAttention({ warrantyEndsOn: '2026-10-25', expiresOn: null }, today)!)).toBe('Warranty ends in 1 day');
  });
  it('words an expiry as expires / expired, not "ends"', () => {
    const label = (expiresOn: string) => statusLabel(receiptAttention({ warrantyEndsOn: null, expiresOn }, today)!);
    expect(label('2026-10-31')).toBe('Expires in 7 days');
    expect(label(today)).toBe('Expires today');
    expect(label('2026-10-23')).toBe('Expired 1 day ago');
  });
});

describe('expiringSoon', () => {
  it('keeps only soon/today items, soonest first, and drops expired and far ones', () => {
    const items = [
      { id: 'far', warrantyEndsOn: '2027-01-01', expiresOn: null }, { id: 'gone', warrantyEndsOn: '2026-01-01', expiresOn: null },
      { id: 'b', warrantyEndsOn: '2026-11-10', expiresOn: null }, { id: 'a', warrantyEndsOn: null, expiresOn: '2026-10-24' },
    ];
    expect(expiringSoon(items, today).map((i) => i.id)).toEqual(['a', 'b']);
  });
});

describe('tags', () => {
  it('lower-cases, trims, collapses spaces, dedupes and splits on commas', () => {
    expect(normalizeTags(' Food,  food , Big   Buy\n,')).toEqual(['food', 'big buy']);
  });
  it('caps tag count and length', () => {
    expect(normalizeTags(Array.from({ length: 15 }, (_, i) => `t${i}`))).toHaveLength(10);
    expect(normalizeTags(['x'.repeat(50)])[0]).toHaveLength(30);
  });
  it('counts usage most-used first and filters by tag and text', () => {
    const rs = [{ merchant: 'Abc', note: '', tags: ['food'] }, { merchant: 'Xyz', note: 'drill', tags: ['tools', 'food'] }];
    expect(tagCounts(rs)).toEqual([{ tag: 'food', count: 2 }, { tag: 'tools', count: 1 }]);
    expect(filterReceipts(rs, '', 'tools')).toHaveLength(1);
    expect(filterReceipts(rs, 'DRILL', null)).toHaveLength(1);
    expect(filterReceipts(rs, 'abc', 'tools')).toHaveLength(0);
  });
});

describe('receiptSchema', () => {
  it('normalizes tags and trims text', () => {
    expect(receiptSchema.parse({ ...base, merchant: '  Store ', tags: ['A', 'a'] })).toMatchObject({ merchant: 'Store', tags: ['a'] });
  });
  it.each([
    [{ merchant: '  ' }], [{ amount: -1 }], [{ amount: NaN }], [{ purchasedOn: '2026-13-01' }], [{ warrantyEndsOn: '2026-09-30' }],
  ])('rejects %j', (patch) => expect(receiptSchema.safeParse({ ...base, ...patch }).success).toBe(false));
  it('allows a warranty ending on the purchase day', () => {
    expect(receiptSchema.safeParse({ ...base, warrantyEndsOn: '2026-10-01' }).success).toBe(true);
  });
});

describe('fitPhoto', () => {
  it('shrinks the long edge and never enlarges', () => {
    expect(fitPhoto(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitPhoto(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });
});

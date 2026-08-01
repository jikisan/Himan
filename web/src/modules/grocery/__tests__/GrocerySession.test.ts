import { describe, it, expect } from 'vitest';
import { GrocerySession } from '@himan/shared/grocery';
import type { SessionItemType } from '@himan/shared/grocery';

function item(overrides: Partial<SessionItemType>): SessionItemType {
  return {
    id: crypto.randomUUID(),
    sessionId: 's1',
    groceryItemId: null,
    productId: null,
    listName: 'List',
    name: 'Item',
    category: null,
    quantity: 1,
    unit: null,
    notes: null,
    isPurchased: false,
    purchasedAt: null,
    price: null,
    pricePaid: null,
    quantityPurchased: null,
    aisle: null,
    storeId: null,
    ...overrides,
  };
}

function session(items: SessionItemType[]): GrocerySession {
  return new GrocerySession({
    id: 's1',
    name: 'Weekend Shopping',
    startedBy: 'u1',
    storeName: 'Market',
    storeId: 'store1',
    status: 'active',
    startedAt: new Date(),
    completedAt: null,
    items,
    members: [],
  });
}

describe('GrocerySession totals', () => {
  it('estimatedTotal sums snapshot price × quantity', () => {
    const s = session([
      item({ price: 10, quantity: 2 }),
      item({ price: 5, quantity: 3 }),
      item({ price: null, quantity: 4 }), // no price contributes 0
    ]);
    expect(s.estimatedTotal).toBe(35);
  });

  it('actualTotal counts only purchased items with price paid', () => {
    const s = session([
      item({ isPurchased: true, pricePaid: 12, quantityPurchased: 2 }),
      item({ isPurchased: true, pricePaid: 8 }), // qty falls back to quantity (1)
      item({ isPurchased: false, pricePaid: 99 }), // not purchased → ignored
      item({ isPurchased: true, pricePaid: null }), // no price → ignored
    ]);
    expect(s.actualTotal).toBe(32);
  });

  it('purchasedCount counts purchased items', () => {
    const s = session([
      item({ isPurchased: true }),
      item({ isPurchased: true }),
      item({ isPurchased: false }),
    ]);
    expect(s.purchasedCount).toBe(2);
  });
});

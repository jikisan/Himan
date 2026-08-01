import type { GrocerySessionType, SessionItemType, SessionMemberType } from '../types/index.js';

export class GrocerySession implements GrocerySessionType {
  id: string;
  name: string | null;
  startedBy: string;
  storeName: string | null;
  storeId: string | null;
  status: 'active' | 'completed';
  startedAt: Date;
  completedAt: Date | null;
  items: SessionItemType[];
  members: SessionMemberType[];

  constructor(data: GrocerySessionType) {
    this.id = data.id;
    this.name = data.name;
    this.startedBy = data.startedBy;
    this.storeName = data.storeName;
    this.storeId = data.storeId;
    this.status = data.status;
    this.startedAt = data.startedAt;
    this.completedAt = data.completedAt;
    this.items = data.items;
    this.members = data.members;
  }

  get isActive(): boolean {
    return this.status === 'active';
  }

  /** Estimated total from snapshot prices × quantity. */
  get estimatedTotal(): number {
    return this.items.reduce(
      (sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 1),
      0
    );
  }

  /** Actual total from prices paid × quantity purchased, for purchased items. */
  get actualTotal(): number {
    return this.items.reduce((sum, item) => {
      if (!item.isPurchased || item.pricePaid == null) return sum;
      return sum + item.pricePaid * (item.quantityPurchased ?? item.quantity ?? 1);
    }, 0);
  }

  get purchasedCount(): number {
    return this.items.filter((i) => i.isPurchased).length;
  }

  get duration(): string {
    const end = this.completedAt ?? new Date();
    const diff = end.getTime() - this.startedAt.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${remainingMinutes}m`;
    }
    return `${minutes}m`;
  }
}

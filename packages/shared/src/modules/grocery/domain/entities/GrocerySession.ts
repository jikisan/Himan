import type { GrocerySessionType, SessionItemType } from '../types/index.js';

export class GrocerySession implements GrocerySessionType {
  id: string;
  startedBy: string;
  storeName: string | null;
  status: 'active' | 'completed';
  startedAt: Date;
  completedAt: Date | null;
  items: SessionItemType[];

  constructor(data: GrocerySessionType) {
    this.id = data.id;
    this.startedBy = data.startedBy;
    this.storeName = data.storeName;
    this.status = data.status;
    this.startedAt = data.startedAt;
    this.completedAt = data.completedAt;
    this.items = data.items;
  }

  get isActive(): boolean {
    return this.status === 'active';
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

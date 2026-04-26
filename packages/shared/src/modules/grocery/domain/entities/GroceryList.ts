import type { GroceryListType } from '../types/index.js';

export class GroceryList implements GroceryListType {
  id: string;
  name: string;
  ownerId: string;
  isArchived: boolean;
  memberCount: number;
  itemCount: number;
  uncheckedCount: number;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: GroceryListType) {
    this.id = data.id;
    this.name = data.name;
    this.ownerId = data.ownerId;
    this.isArchived = data.isArchived;
    this.memberCount = data.memberCount;
    this.itemCount = data.itemCount;
    this.uncheckedCount = data.uncheckedCount;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  get checkedCount(): number {
    return this.itemCount - this.uncheckedCount;
  }

  get progress(): number {
    if (this.itemCount === 0) return 0;
    return this.checkedCount / this.itemCount;
  }

  get progressLabel(): string {
    return `${this.checkedCount}/${this.itemCount} items`;
  }

  get isShared(): boolean {
    return this.memberCount > 1;
  }

  getRelativeTime(): string {
    const now = new Date();
    const diff = now.getTime() - this.updatedAt.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 7) {
      return this.updatedAt.toLocaleDateString();
    } else if (days > 0) {
      return days + (days > 1 ? ' days ago' : ' day ago');
    } else if (hours > 0) {
      return hours + (hours > 1 ? ' hours ago' : ' hour ago');
    } else if (minutes > 0) {
      return minutes + (minutes > 1 ? ' minutes ago' : ' minute ago');
    } else {
      return 'Just now';
    }
  }
}

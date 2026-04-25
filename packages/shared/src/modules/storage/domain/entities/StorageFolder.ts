import type { StorageFolderType } from '../types';

export class StorageFolder {
  readonly id: string;
  readonly userId: string;
  readonly name: string;
  readonly filesCount: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(data: StorageFolderType) {
    this.id = data.id;
    this.userId = data.userId;
    this.name = data.name;
    this.filesCount = data.filesCount;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  /**
   * Get relative time (e.g., "2 hours ago")
   */
  getRelativeTime(): string {
    const now = new Date();
    const diff = now.getTime() - this.createdAt.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return days === 1 ? '1 day ago' : `${days} days ago`;
    }
    if (hours > 0) {
      return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
    }
    if (minutes > 0) {
      return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
    }
    return 'Just now';
  }
}

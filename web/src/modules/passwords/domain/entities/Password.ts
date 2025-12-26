import type { PasswordType } from '../types';

export class Password implements PasswordType {
  id: string;
  title: string;
  username: string | null;
  password: string;
  url: string | null;
  notes: string | null;
  categoryId: string | null;
  userId: string;
  isFavorite: boolean;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: PasswordType) {
    this.id = data.id;
    this.title = data.title;
    this.username = data.username;
    this.password = data.password;
    this.url = data.url;
    this.notes = data.notes;
    this.categoryId = data.categoryId;
    this.userId = data.userId;
    this.isFavorite = data.isFavorite;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
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

  getDisplayUrl(): string {
    if (!this.url) return '';
    try {
      const url = new URL(this.url);
      return url.hostname;
    } catch {
      return this.url;
    }
  }

  isValidUrl(): boolean {
    if (!this.url) return false;
    try {
      new URL(this.url);
      return true;
    } catch {
      return false;
    }
  }
}

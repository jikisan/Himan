import type { Note as NoteType } from '../types';

export class Note implements NoteType {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  folderId: string | null;
  userId: string;
  isPinned: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;

  constructor(data: NoteType) {
    this.id = data.id;
    this.title = data.title;
    this.content = data.content;
    this.excerpt = data.excerpt;
    this.folderId = data.folderId;
    this.userId = data.userId;
    this.isPinned = data.isPinned;
    this.tags = data.tags;
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

  static generateExcerpt(content: string, maxLength: number = 150): string {
    const plainText = content.replace(/<[^>]*>/g, '').trim();
    if (plainText.length <= maxLength) {
      return plainText;
    }
    return plainText.substring(0, maxLength).trim() + '...';
  }
}

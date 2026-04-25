import type { FileType } from '../types';

export class File {
  readonly id: string;
  readonly userId: string;
  readonly folderId: string | null;
  readonly name: string;
  readonly size: number;
  readonly mimeType: string;
  readonly description: string | null;
  readonly thumbnailUrl: string | null;
  readonly storagePath: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(data: FileType) {
    this.id = data.id;
    this.userId = data.userId;
    this.folderId = data.folderId;
    this.name = data.name;
    this.size = data.size;
    this.mimeType = data.mimeType;
    this.description = data.description;
    this.thumbnailUrl = data.thumbnailUrl;
    this.storagePath = data.storagePath;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  /**
   * Get file extension
   */
  get extension(): string {
    const parts = this.name.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  }

  /**
   * Get formatted file size
   */
  get formattedSize(): string {
    return File.formatBytes(this.size);
  }

  /**
   * Check if file is an image
   */
  get isImage(): boolean {
    return this.mimeType.startsWith('image/');
  }

  /**
   * Check if file is a video
   */
  get isVideo(): boolean {
    return this.mimeType.startsWith('video/');
  }

  /**
   * Check if file is a PDF
   */
  get isPDF(): boolean {
    return this.mimeType === 'application/pdf';
  }

  /**
   * Check if file is a document
   */
  get isDocument(): boolean {
    const documentTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
    ];
    return documentTypes.includes(this.mimeType);
  }

  /**
   * Get relative time (e.g., "2 hours ago")
   */
  getRelativeTime(): string {
    const now = new Date();
    const diff = now.getTime() - this.updatedAt.getTime();
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

  /**
   * Format bytes to human-readable string
   */
  static formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}

import type { UsageLimitsType } from '../types';

export class UsageLimits {
  readonly id: string;
  readonly userId: string;
  readonly notesCount: number;
  readonly foldersCount: number;
  readonly passwordsCount: number;
  readonly categoriesCount: number;
  readonly filesCount: number;
  readonly storageUsed: number;
  readonly storageFoldersCount: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(
    id: string,
    userId: string,
    notesCount: number,
    foldersCount: number,
    passwordsCount: number,
    categoriesCount: number,
    filesCount: number,
    storageUsed: number,
    storageFoldersCount: number,
    createdAt: Date,
    updatedAt: Date
  ) {
    this.id = id;
    this.userId = userId;
    this.notesCount = notesCount;
    this.foldersCount = foldersCount;
    this.passwordsCount = passwordsCount;
    this.categoriesCount = categoriesCount;
    this.filesCount = filesCount;
    this.storageUsed = storageUsed;
    this.storageFoldersCount = storageFoldersCount;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Create from plain object
   */
  static fromObject(data: UsageLimitsType): UsageLimits {
    return new UsageLimits(
      data.id,
      data.userId,
      data.notesCount,
      data.foldersCount,
      data.passwordsCount,
      data.categoriesCount,
      data.filesCount,
      data.storageUsed,
      data.storageFoldersCount,
      data.createdAt,
      data.updatedAt
    );
  }

  /**
   * Convert to plain object
   */
  toObject(): UsageLimitsType {
    return {
      id: this.id,
      userId: this.userId,
      notesCount: this.notesCount,
      foldersCount: this.foldersCount,
      passwordsCount: this.passwordsCount,
      categoriesCount: this.categoriesCount,
      filesCount: this.filesCount,
      storageUsed: this.storageUsed,
      storageFoldersCount: this.storageFoldersCount,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

import type { Folder as FolderType } from '../types';

export class Folder implements FolderType {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  userId: string;
  noteCount?: number;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: FolderType) {
    this.id = data.id;
    this.name = data.name;
    this.color = data.color;
    this.icon = data.icon;
    this.userId = data.userId;
    this.noteCount = data.noteCount;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  hasNotes(): boolean {
    return (this.noteCount ?? 0) > 0;
  }
}

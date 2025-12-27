export interface Note {
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
}

export interface Folder {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  userId: string;
  noteCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateNoteDto {
  title: string;
  content: string;
  excerpt: string;
  folderId: string | null;
  userId: string;
  isPinned?: boolean;
  tags?: string[];
}

export interface UpdateNoteDto {
  title?: string;
  content?: string;
  excerpt?: string;
  folderId?: string | null;
  isPinned?: boolean;
  tags?: string[];
}

export interface CreateFolderDto {
  name: string;
  color?: string | null;
  icon?: string | null;
  userId: string;
}

export interface UpdateFolderDto {
  name?: string;
  color?: string | null;
  icon?: string | null;
}

export interface NoteFilters {
  folderId?: string | null;
  searchQuery?: string;
  isPinned?: boolean;
  tags?: string[];
}

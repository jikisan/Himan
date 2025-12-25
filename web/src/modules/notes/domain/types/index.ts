export interface CreateFolderDto {
  name: string;
  color?: string;
  icon?: string;
  userId: string;
}

export interface UpdateFolderDto {
  name?: string;
  color?: string;
  icon?: string;
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

export interface FolderRepository {
  findAll(userId: string): Promise<import('../entities').Folder[]>;
  findById(id: string): Promise<import('../entities').Folder | null>;
  create(dto: CreateFolderDto): Promise<import('../entities').Folder>;
  update(id: string, dto: UpdateFolderDto): Promise<import('../entities').Folder>;
  delete(id: string): Promise<void>;
}

export interface NoteRepository {
  findAll(userId: string): Promise<import('../entities').Note[]>;
  findById(id: string): Promise<import('../entities').Note | null>;
  findByFolder(folderId: string | null, userId: string): Promise<import('../entities').Note[]>;
  search(query: string, userId: string, folderId?: string | null): Promise<import('../entities').Note[]>;
  create(dto: CreateNoteDto): Promise<import('../entities').Note>;
  update(id: string, dto: UpdateNoteDto): Promise<import('../entities').Note>;
  delete(id: string): Promise<void>;
}

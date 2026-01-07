export type FileType = {
  id: string;
  userId: string;
  folderId: string | null;
  name: string;
  size: number; // in bytes
  mimeType: string;
  description: string | null;
  thumbnailUrl: string | null;
  storagePath: string;
  createdAt: Date;
  updatedAt: Date;
};

export type StorageFolderType = {
  id: string;
  userId: string;
  name: string;
  filesCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateFileDto = {
  userId: string;
  folderId?: string | null;
  name: string;
  size: number;
  mimeType: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  storagePath: string;
};

export type UpdateFileDto = {
  name?: string;
  folderId?: string | null;
  description?: string | null;
  thumbnailUrl?: string | null;
};

export type CreateStorageFolderDto = {
  userId: string;
  name: string;
};

export type UpdateStorageFolderDto = {
  name: string;
};

export type FileFilters = {
  folderId?: string | null;
  searchQuery?: string;
};

export type FileUploadProgress = {
  fileId: string;
  fileName: string;
  progress: number; // 0-100
  status: 'pending' | 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
};

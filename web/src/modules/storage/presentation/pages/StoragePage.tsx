import { useState, useCallback, useMemo } from 'react';
import { Search } from 'lucide-react';
import { FolderList, FileGrid, FileUploadButton, FileDialog, FilePreviewDialog } from '../components';
import { useFiles, useStorageFolders } from '../hooks';
import { StorageService } from '../../infrastructure/services';
import type { File as FileEntity } from '../../domain/entities';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui';

export const StoragePage = () => {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFolderCollapsed, setIsFolderCollapsed] = useState(false);
  const [editingFile, setEditingFile] = useState<FileEntity | null>(null);
  const [previewFile, setPreviewFile] = useState<FileEntity | null>(null);
  const [isFileDialogOpen, setIsFileDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [deleteFileDialogOpen, setDeleteFileDialogOpen] = useState(false);
  const [deleteFolderDialogOpen, setDeleteFolderDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<string | null>(null);
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);

  const fileFilters = useMemo(() => {
    const filters: {
      folderId?: string | null;
      searchQuery?: string;
    } = {};

    if (selectedFolderId !== 'all') {
      filters.folderId = selectedFolderId;
    }

    if (searchQuery) {
      filters.searchQuery = searchQuery;
    }

    return filters;
  }, [selectedFolderId, searchQuery]);

  const {
    files,
    loading: filesLoading,
    createFile,
    updateFile,
    deleteFile,
    refetch: refetchFiles,
  } = useFiles(fileFilters);

  const {
    folders,
    loading: foldersLoading,
    createFolder,
    updateFolder,
    deleteFolder,
    refetch: refetchFolders,
  } = useStorageFolders();

  const handleUploadComplete = useCallback(
    async (data: {
      name: string;
      size: number;
      mimeType: string;
      storagePath: string;
      thumbnailPath: string | null;
    }) => {
      const file = await createFile({
        name: data.name,
        size: data.size,
        mimeType: data.mimeType,
        storagePath: data.storagePath,
        thumbnailUrl: data.thumbnailPath,
        folderId: selectedFolderId === 'all' ? null : selectedFolderId,
      });

      if (file) {
        refetchFolders();
      }

      return file;
    },
    [createFile, selectedFolderId, refetchFolders]
  );

  const handlePreviewFile = useCallback((file: FileEntity) => {
    setPreviewFile(file);
    setIsPreviewDialogOpen(true);
  }, []);

  const handleEditFile = useCallback((file: FileEntity) => {
    setEditingFile(file);
    setIsFileDialogOpen(true);
  }, []);

  const handleSaveFile = useCallback(
    async (data: {
      name: string;
      folderId: string | null;
      description: string | null;
    }) => {
      if (editingFile) {
        await updateFile(editingFile.id, data);
        refetchFolders();
      }
    },
    [editingFile, updateFile, refetchFolders]
  );

  const handleDeleteFile = useCallback((id: string) => {
    setFileToDelete(id);
    setDeleteFileDialogOpen(true);
  }, []);

  const confirmDeleteFile = useCallback(async () => {
    if (fileToDelete) {
      const file = files.find((f) => f.id === fileToDelete);
      if (file) {
        // Delete from storage
        try {
          await StorageService.delete(file.storagePath);
          if (file.thumbnailUrl) {
            await StorageService.delete(file.thumbnailUrl);
          }
        } catch (error) {
          console.error('Error deleting from storage:', error);
        }

        // Delete from database
        const success = await deleteFile(fileToDelete);
        if (success) {
          refetchFolders();
        }
      }
      setFileToDelete(null);
    }
  }, [fileToDelete, files, deleteFile, refetchFolders]);

  const handleCreateFolder = useCallback(
    async (name: string) => {
      await createFolder({ name });
      refetchFolders();
    },
    [createFolder, refetchFolders]
  );

  const handleUpdateFolder = useCallback(
    async (id: string, name: string) => {
      await updateFolder(id, { name });
      refetchFolders();
    },
    [updateFolder, refetchFolders]
  );

  const handleDeleteFolder = useCallback(async (id: string) => {
    setFolderToDelete(id);
    setDeleteFolderDialogOpen(true);
  }, []);

  const confirmDeleteFolder = useCallback(async () => {
    if (folderToDelete) {
      await deleteFolder(folderToDelete);
      refetchFolders();
      refetchFiles();
      if (selectedFolderId === folderToDelete) {
        setSelectedFolderId('all');
      }
      setFolderToDelete(null);
    }
  }, [folderToDelete, deleteFolder, selectedFolderId, refetchFolders, refetchFiles]);

  const handleToggleFolderCollapse = useCallback(() => {
    setIsFolderCollapsed((prev) => !prev);
  }, []);

  const handleDownloadFile = useCallback(async (file: FileEntity) => {
    try {
      const blob = await StorageService.download(file.storagePath);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Failed to download file');
    }
  }, []);

  return (
    <>
      <div className="flex h-screen bg-secondary">
        <FolderList
          folders={folders}
          selectedFolderId={selectedFolderId}
          onSelectFolder={setSelectedFolderId}
          onCreateFolder={handleCreateFolder}
          onUpdateFolder={handleUpdateFolder}
          onDeleteFolder={handleDeleteFolder}
          loading={foldersLoading}
          isCollapsed={isFolderCollapsed}
          onToggleCollapse={handleToggleFolderCollapse}
        />

        <div className="flex-1 flex flex-col bg-background">
          {/* Header with search and upload button */}
          <div className="p-4 border-b border-border flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <FileUploadButton
              folderId={selectedFolderId === 'all' ? null : selectedFolderId}
              onUploadComplete={handleUploadComplete}
            />
          </div>

          {/* File Grid */}
          <FileGrid
            files={files}
            onEdit={handleEditFile}
            onDelete={handleDeleteFile}
            onPreview={handlePreviewFile}
            loading={filesLoading}
            folderId={selectedFolderId === 'all' ? null : selectedFolderId}
            onUploadComplete={handleUploadComplete}
          />
        </div>
      </div>

      {/* File Preview Dialog */}
      <FilePreviewDialog
        file={previewFile}
        open={isPreviewDialogOpen}
        onOpenChange={setIsPreviewDialogOpen}
        onEdit={handleEditFile}
        onDelete={handleDeleteFile}
        onDownload={handleDownloadFile}
      />

      {/* File Details Dialog */}
      <FileDialog
        file={editingFile}
        folders={folders}
        open={isFileDialogOpen}
        onOpenChange={setIsFileDialogOpen}
        onSave={handleSaveFile}
      />

      {/* Delete File Confirmation */}
      <ConfirmDialog
        open={deleteFileDialogOpen}
        onOpenChange={setDeleteFileDialogOpen}
        title="Delete File"
        description="Are you sure you want to delete this file? This action cannot be undone and the file will be permanently removed from storage."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteFile}
        variant="destructive"
      />

      {/* Delete Folder Confirmation */}
      <ConfirmDialog
        open={deleteFolderDialogOpen}
        onOpenChange={setDeleteFolderDialogOpen}
        title="Delete Folder"
        description={
          folders.find((f) => f.id === folderToDelete)?.filesCount
            ? 'This folder contains files. All files will be moved to "Unfiled". Continue?'
            : 'Are you sure you want to delete this folder?'
        }
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteFolder}
        variant="destructive"
      />
    </>
  );
};

import type { File } from '../../domain/entities';
import { FileCard } from './FileCard';
import { FileUploadButton } from './FileUploadButton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload } from 'lucide-react';
import type { File as FileEntity } from '../../domain/entities';

interface FileGridProps {
  files: File[];
  onEdit: (file: File) => void;
  onDelete: (id: string) => void;
  onPreview?: (file: File) => void;
  loading?: boolean;
  folderId?: string | null;
  onUploadComplete?: (file: {
    name: string;
    size: number;
    mimeType: string;
    storagePath: string;
    thumbnailPath: string | null;
  }) => Promise<FileEntity | null>;
}

export const FileGrid = ({ files, onEdit, onDelete, onPreview, loading, folderId, onUploadComplete }: FileGridProps) => {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-secondary p-6">
              <Upload className="w-12 h-12 text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-lg font-medium text-foreground">No files yet</p>
            <p className="text-sm">Upload your first file to get started</p>
          </div>
          {onUploadComplete && (
            <div className="pt-2">
              <FileUploadButton
                folderId={folderId || null}
                onUploadComplete={onUploadComplete}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {files.map((file) => (
          <FileCard
            key={file.id}
            file={file}
            onEdit={onEdit}
            onDelete={onDelete}
            onPreview={onPreview}
          />
        ))}
      </div>
    </ScrollArea>
  );
};

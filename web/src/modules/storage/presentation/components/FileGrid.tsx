import type { File } from '../../domain/entities';
import { FileCard } from './FileCard';
import { ScrollArea } from '@/components/ui/scroll-area';

interface FileGridProps {
  files: File[];
  onEdit: (file: File) => void;
  onDelete: (id: string) => void;
  loading?: boolean;
}

export const FileGrid = ({ files, onEdit, onDelete, loading }: FileGridProps) => {
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
        <div className="text-center space-y-2">
          <p className="text-lg">No files yet</p>
          <p className="text-sm">Upload your first file to get started</p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {files.map((file) => (
          <FileCard key={file.id} file={file} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>
    </ScrollArea>
  );
};

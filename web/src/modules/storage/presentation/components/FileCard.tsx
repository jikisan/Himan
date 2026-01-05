import { File as FileIcon, Image, FileText, Video, MoreVertical, Download, Trash2, Edit } from 'lucide-react';
import type { File } from '../../domain/entities';
import { StorageService } from '../../infrastructure/services';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

interface FileCardProps {
  file: File;
  onEdit: (file: File) => void;
  onDelete: (id: string) => void;
}

export const FileCard = ({ file, onEdit, onDelete }: FileCardProps) => {
  const handleDownload = async () => {
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
  };

  const getFileIcon = () => {
    if (file.isImage) return Image;
    if (file.isVideo) return Video;
    if (file.isDocument) return FileText;
    return FileIcon;
  };

  const Icon = getFileIcon();

  return (
    <div className="group relative bg-background border border-border rounded-lg p-4 hover:border-primary transition-colors">
      {/* File Preview/Icon */}
      <div className="aspect-square mb-3 bg-secondary rounded-md flex items-center justify-center overflow-hidden">
        {file.thumbnailUrl ? (
          <img
            src={StorageService.getPublicUrl(file.thumbnailUrl)}
            alt={file.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Icon className="w-12 h-12 text-muted-foreground" />
        )}
      </div>

      {/* File Info */}
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-foreground truncate" title={file.name}>
          {file.name}
        </h3>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{file.formattedSize}</span>
          <span>{file.getRelativeTime()}</span>
        </div>
      </div>

      {/* Actions Menu */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 bg-background/80 backdrop-blur">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(file)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(file.id)} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};

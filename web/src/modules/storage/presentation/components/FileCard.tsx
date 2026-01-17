import { useState, useEffect } from 'react';
import {
  File as FileIcon,
  Image,
  FileText,
  Video,
  Music,
  Archive,
  FileSpreadsheet,
  Presentation,
  MoreVertical,
  Download,
  Trash2,
  Edit
} from 'lucide-react';
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
  onPreview?: (file: File) => void;
}

export const FileCard = ({ file, onEdit, onDelete, onPreview }: FileCardProps) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Load authenticated URLs for thumbnails and images
  useEffect(() => {
    const loadUrls = async () => {
      if (file.thumbnailUrl) {
        try {
          const url = await StorageService.getSignedUrl(file.thumbnailUrl, 3600);
          setThumbnailUrl(url);
        } catch (error) {
          console.error('Error loading thumbnail URL:', error);
        }
      } else if (file.isImage) {
        // If no thumbnail but it's an image, use the original file
        try {
          const url = await StorageService.getSignedUrl(file.storagePath, 3600);
          setImageUrl(url);
        } catch (error) {
          console.error('Error loading image URL:', error);
        }
      }
    };

    loadUrls();
  }, [file.thumbnailUrl, file.isImage, file.storagePath]);
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
    // Images
    if (file.isImage) return Image;

    // Videos
    if (file.isVideo) return Video;

    // Audio
    if (file.mimeType.startsWith('audio/')) return Music;

    // Archives (zip, rar, etc.)
    if (file.mimeType.includes('zip') || file.mimeType.includes('compressed')) {
      return Archive;
    }

    // Spreadsheets (Excel, CSV)
    if (
      file.mimeType.includes('spreadsheet') ||
      file.mimeType === 'text/csv' ||
      file.extension === 'xlsx' ||
      file.extension === 'xls' ||
      file.extension === 'csv'
    ) {
      return FileSpreadsheet;
    }

    // Presentations (PowerPoint)
    if (
      file.mimeType.includes('presentation') ||
      file.extension === 'pptx' ||
      file.extension === 'ppt'
    ) {
      return Presentation;
    }

    // Documents (PDF, Word, Text)
    if (file.isDocument) return FileText;

    // Default
    return FileIcon;
  };

  const Icon = getFileIcon();

  const getIconColor = () => {
    if (file.isImage) return 'text-green-500';
    if (file.isVideo) return 'text-purple-500';
    if (file.mimeType.startsWith('audio/')) return 'text-pink-500';
    if (file.mimeType.includes('zip') || file.mimeType.includes('compressed')) return 'text-orange-500';
    if (file.mimeType.includes('spreadsheet') || file.extension === 'xlsx' || file.extension === 'xls' || file.extension === 'csv') {
      return 'text-emerald-500';
    }
    if (file.mimeType.includes('presentation') || file.extension === 'pptx' || file.extension === 'ppt') {
      return 'text-red-500';
    }
    if (file.isPDF) return 'text-red-600';
    if (file.isDocument) return 'text-blue-500';
    return 'text-muted-foreground';
  };

  const handleCardClick = () => {
    // Only trigger preview for images and videos
    if ((file.isImage || file.isVideo) && onPreview) {
      onPreview(file);
    }
  };

  return (
    <div className="group relative bg-background border border-border rounded-lg p-4 hover:border-primary transition-colors">
      {/* File Preview/Icon */}
      <div
        className={`aspect-square mb-3 bg-secondary rounded-md flex items-center justify-center overflow-hidden ${
          (file.isImage || file.isVideo) && onPreview ? 'cursor-pointer' : ''
        }`}
        onClick={handleCardClick}
      >
        {thumbnailUrl ? (
          <img
            src={thumbnailUrl}
            alt={file.name}
            className="w-full h-full object-cover"
          />
        ) : imageUrl ? (
          <img
            src={imageUrl}
            alt={file.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Icon className={`w-12 h-12 ${getIconColor()}`} />
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

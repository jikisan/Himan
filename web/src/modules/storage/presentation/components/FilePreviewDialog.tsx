import { useState, useEffect } from 'react';
import { X, Download, Trash2, Edit } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import type { File } from '../../domain/entities';
import { StorageService } from '../../infrastructure/services';

interface FilePreviewDialogProps {
  file: File | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (file: File) => void;
  onDelete: (id: string) => void;
  onDownload: (file: File) => void;
}

export const FilePreviewDialog = ({
  file,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onDownload,
}: FilePreviewDialogProps) => {
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadMediaUrl = async () => {
      if (!file || (!file.isImage && !file.isVideo)) {
        setMediaUrl(null);
        return;
      }

      setLoading(true);
      try {
        const url = await StorageService.getSignedUrl(file.storagePath, 3600);
        setMediaUrl(url);
      } catch (error) {
        console.error('Error loading media URL:', error);
      } finally {
        setLoading(false);
      }
    };

    if (open && file) {
      loadMediaUrl();
    } else {
      setMediaUrl(null);
    }
  }, [file, open]);

  if (!file) return null;

  const handleEdit = () => {
    onEdit(file);
    onOpenChange(false);
  };

  const handleDelete = () => {
    onDelete(file.id);
    onOpenChange(false);
  };

  const handleDownload = () => {
    onDownload(file);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full h-screen p-0 bg-black/30">
        {/* Accessible title for screen readers */}
        <VisuallyHidden>
          <DialogTitle>{file.name}</DialogTitle>
          <DialogDescription>
            File preview for {file.name}. Use the controls to edit, download, or delete the file.
          </DialogDescription>
        </VisuallyHidden>

        {/* Top overlay bar - File info, actions, and close button */}
        <div className="absolute top-0 left-0 right-0 z-50 bg-linear-to-b from-black/70 via-black/40 to-transparent p-6">
          {/* Top row: File name and action buttons */}
          <div className="flex items-start justify-between gap-4 mb-2">
            <h2 className="text-lg font-semibold text-white truncate flex-1">{file.name}</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleEdit}
                className="text-white hover:bg-white/20"
              >
                <Edit className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDownload}
                className="text-white hover:bg-white/20"
              >
                <Download className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                className="text-red-400 hover:text-red-300 hover:bg-white/20"
              >
                <Trash2 className="h-5 w-5" />
              </Button>
              <button
                onClick={() => onOpenChange(false)}
                className="p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* File details below */}
          <div className="flex items-center gap-3 text-sm text-white/80">
            <span>{file.formattedSize}</span>
            <span>•</span>
            <span>{file.getRelativeTime()}</span>
          </div>
        </div>

        {/* Full-screen media preview */}
        <div className="absolute top-28 bottom-0 left-0 right-0 flex items-center justify-center px-6 py-6">
          {loading ? (
            <div className="flex items-center justify-center">
              <p className="text-white/80">Loading preview...</p>
            </div>
          ) : file.isImage && mediaUrl ? (
            <img
              src={mediaUrl}
              alt={file.name}
              className="max-w-full max-h-full object-contain"
            />
          ) : file.isVideo && mediaUrl ? (
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                src={mediaUrl}
                controls
                className="max-w-full max-h-full object-contain"
              >
                Your browser does not support the video tag.
              </video>
              {/* Gradient behind video controls for better visibility */}
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-linear-to-t from-black/60 to-transparent pointer-events-none" />
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <p className="text-white/80">Preview not available for this file type</p>
            </div>
          )}
        </div>

        {/* Bottom overlay bar - Description */}
        {file.description && (
          <div className="absolute bottom-0 left-0 right-0 z-40 bg-linear-to-t from-black/70 via-black/40 to-transparent p-6 pb-8">
            <div className="max-w-4xl mx-auto">
              <p className="text-sm font-medium text-white mb-1">Description</p>
              <p className="text-sm text-white/80">{file.description}</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

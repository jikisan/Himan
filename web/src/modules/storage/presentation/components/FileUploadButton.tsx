import { useCallback, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useFileUpload } from '../hooks';
import type { File as FileEntity } from '../../domain/entities';

interface FileUploadButtonProps {
  folderId: string | null;
  onUploadComplete: (file: {
    name: string;
    size: number;
    mimeType: string;
    storagePath: string;
    thumbnailPath: string | null;
  }) => Promise<FileEntity | null>;
}

export const FileUploadButton = ({ onUploadComplete }: FileUploadButtonProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [showProgressDialog, setShowProgressDialog] = useState(false);
  const { uploadFile, uploadProgress } = useFileUpload();

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setShowProgressDialog(true);

    // Upload files one by one
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const result = await uploadFile(file);

      if (result.success && result.storagePath) {
        await onUploadComplete({
          name: file.name,
          size: result.compressedSize ?? file.size,
          mimeType: file.type,
          storagePath: result.storagePath,
          thumbnailPath: result.thumbnailPath || null,
        });
      } else {
        alert(`Failed to upload ${file.name}: ${result.error}`);
      }
    }

    // Close dialog after a delay
    setTimeout(() => {
      setShowProgressDialog(false);
    }, 1000);
  }, [uploadFile, onUploadComplete]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleButtonClick = () => {
    document.getElementById('file-upload-input')?.click();
  };

  return (
    <>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative ${
          isDragOver ? 'outline-2 outline-dashed outline-primary outline-offset-2' : ''
        }`}
      >
        <input
          type="file"
          multiple
          className="hidden"
          id="file-upload-input"
          onChange={(e) => handleFileSelect(e.target.files)}
        />
        <Button type="button" onClick={handleButtonClick}>
          <Upload className="h-4 w-4 mr-2" />
          Upload Files
        </Button>
      </div>

      {/* Upload Progress Dialog */}
      <Dialog open={showProgressDialog} onOpenChange={setShowProgressDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Uploading Files</DialogTitle>
            <DialogDescription>Please wait while your files are being uploaded...</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {uploadProgress.map((progress) => (
              <div key={progress.fileId} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate flex-1 mr-4">{progress.fileName}</span>
                  <span className="text-muted-foreground">{progress.progress}%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      progress.status === 'error'
                        ? 'bg-destructive'
                        : progress.status === 'complete'
                        ? 'bg-green-500'
                        : 'bg-primary'
                    }`}
                    style={{ width: `${progress.progress}%` }}
                  />
                </div>
                {progress.error && (
                  <p className="text-xs text-destructive">{progress.error}</p>
                )}
                {progress.status === 'compressing' && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Compressing...
                  </p>
                )}
                {progress.status === 'processing' && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Generating thumbnail...
                  </p>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

import { useState, useEffect, type FormEvent } from 'react';
import { useFieldErrors } from '@core/presentation/hooks';
import { FieldError, FormErrorBanner } from '@core/presentation/components';
import { Download, File as FileIcon, Image, Video, FileText } from 'lucide-react';
import type { File } from '../../domain/entities';
import type { StorageFolder } from '../../domain/entities';
import { StorageService } from '../../infrastructure/services';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface FileDialogProps {
  file: File | null;
  folders: StorageFolder[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    name: string;
    folderId: string | null;
    description: string | null;
  }) => Promise<void>;
}

export const FileDialog = ({ file, folders, open, onOpenChange, onSave }: FileDialogProps) => {
  const [name, setName] = useState('');
  const [folderId, setFolderId] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const fe = useFieldErrors();
  const clearErrors = fe.clear;

  useEffect(() => {
    if (file) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset form when editing a different file
      setName(file.name);
      setFolderId(file.folderId);
      setDescription(file.description || '');
      clearErrors();
    }
  }, [file, clearErrors]);

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    fe.clear();
    if (!file) return;
    if (!name.trim()) { fe.fail('name', 'Enter a file name'); return; }

    setIsSaving(true);
    try {
      await onSave({
        name: name.trim(),
        folderId,
        description: description.trim() || null,
      });
      onOpenChange(false);
    } catch {
      fe.setFormError('Failed to save file');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = async () => {
    if (!file) return;

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
      fe.setFormError('Failed to download file');
    }
  };

  if (!file) return null;

  const renderFileIcon = () => {
    if (file.isImage) return <Image className="w-24 h-24 text-muted-foreground" />;
    if (file.isVideo) return <Video className="w-24 h-24 text-muted-foreground" />;
    if (file.isDocument) return <FileText className="w-24 h-24 text-muted-foreground" />;
    return <FileIcon className="w-24 h-24 text-muted-foreground" />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>File Details</DialogTitle>
          <DialogDescription>View and edit file information</DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={handleSave}>
        <div className="space-y-6 py-4">
          <FormErrorBanner message={fe.formError} />
          {/* File Preview */}
          <div className="flex items-center justify-center bg-secondary rounded-lg p-6">
            {file.thumbnailUrl ? (
              <img
                src={StorageService.getPublicUrl(file.thumbnailUrl)}
                alt={file.name}
                className="max-w-full max-h-64 object-contain rounded"
              />
            ) : (
              renderFileIcon()
            )}
          </div>

          {/* File Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Size:</span>
              <span className="ml-2 font-medium">{file.formattedSize}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Type:</span>
              <span className="ml-2 font-medium">{file.mimeType}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Uploaded:</span>
              <span className="ml-2 font-medium">{file.getRelativeTime()}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Extension:</span>
              <span className="ml-2 font-medium">.{file.extension}</span>
            </div>
          </div>

          {/* Editable Fields */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="name" required>File Name</Label>
              <Input
                id="name"
                required
                {...fe.invalid('name')}
                value={name}
                onChange={(e) => { setName(e.target.value); fe.clear('name'); }}
                placeholder="File name"
                maxLength={255}
              />
              <FieldError id="name" message={fe.errors.name} />
            </div>

            <div>
              <Label htmlFor="folder">Folder</Label>
              <Select value={folderId || 'none'} onValueChange={(value) => setFolderId(value === 'none' ? null : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select folder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unfiled</SelectItem>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      {folder.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                placeholder="Add a description..."
                rows={3}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

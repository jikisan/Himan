import { useRef, type ChangeEvent } from 'react';
import { FileCheck2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface CvUploadPanelProps {
  hasCv: boolean;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
  onCopyLink: () => Promise<void>;
  isSaving: boolean;
}

export const CvUploadPanel = ({ hasCv, onUpload, onRemove, onCopyLink, isSaving }: CvUploadPanelProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File size must be less than 10MB.');
      return;
    }

    await onUpload(file);
  };

  return (
    <div className="space-y-2">
      <input ref={fileInputRef} type="file" accept="application/pdf" onChange={handleFileChange} className="hidden" />

      {hasCv ? (
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <FileCheck2 className="h-4 w-4" />
            CV attached
          </span>
          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isSaving}>
            Replace
          </Button>
          <Button size="sm" variant="outline" onClick={onCopyLink}>
            Copy CV link
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onRemove} disabled={isSaving}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isSaving}>
          <Upload className="h-4 w-4 mr-1.5" />
          Upload CV (PDF)
        </Button>
      )}
    </div>
  );
};

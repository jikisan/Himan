import { useRef, type ChangeEvent } from 'react';
import { Download, FileX2, Link2, ShieldOff, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface CvUploadPanelProps {
  hasCv: boolean;
  cvPreviewUrl: string | null;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
  onCopyLink: () => Promise<void>;
  onDownload: () => Promise<void>;
  hasShareLink: boolean;
  onRevokeLink: () => void;
  isSaving: boolean;
}

// Preview relies on the browser's native PDF renderer (iframe), which already
// pages/scrolls through multi-page PDFs on its own — no extra viewer library needed.
export const CvUploadPanel = ({ hasCv, cvPreviewUrl, onUpload, onRemove, onCopyLink, onDownload, hasShareLink, onRevokeLink, isSaving }: CvUploadPanelProps) => {
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
    <div>
      <input ref={fileInputRef} type="file" accept="application/pdf" onChange={handleFileChange} className="hidden" />

      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-muted-foreground">CV</h3>
        <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
          <span title={isSaving ? 'Uploading…' : undefined}>
            <Button variant="ghost" size="icon" className="h-7 w-7" title={hasCv ? 'Replace CV' : 'Upload CV'} onClick={() => fileInputRef.current?.click()} disabled={isSaving}>
              <Upload className="h-4 w-4" />
            </Button>
          </span>
          <span title={!hasCv ? 'Upload a CV first' : undefined}>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Copy CV link" onClick={onCopyLink} disabled={!hasCv}>
              <Link2 className="h-4 w-4" />
            </Button>
          </span>
          <span title={!hasCv ? 'Upload a CV first' : undefined}>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Download CV" onClick={onDownload} disabled={!hasCv}>
              <Download className="h-4 w-4" />
            </Button>
          </span>
          <span title={!hasShareLink ? 'No CV link to revoke yet' : undefined}>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Revoke CV link" onClick={onRevokeLink} disabled={!hasShareLink}>
              <ShieldOff className="h-4 w-4" />
            </Button>
          </span>
          <div className="w-px h-4 bg-border mx-0.5" />
          <span title={!hasCv ? 'Upload a CV first' : isSaving ? 'Uploading…' : undefined}>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Remove CV" onClick={onRemove} disabled={!hasCv || isSaving}>
              <FileX2 className="h-4 w-4" />
            </Button>
          </span>
        </div>
      </div>

      <div
        className={
          cvPreviewUrl
            ? 'rounded-lg border border-border bg-muted/30 overflow-hidden'
            : 'rounded-lg border border-dashed border-border bg-muted/20 overflow-hidden'
        }
        style={{ aspectRatio: '210 / 297' }}
      >
        {cvPreviewUrl ? (
          <iframe src={cvPreviewUrl} title="CV preview" className="w-full h-full" />
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSaving || hasCv}
            className="h-full w-full flex flex-col items-center justify-center gap-2 p-4 text-center disabled:cursor-default"
          >
            <Upload className="h-5 w-5 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {hasCv ? 'Loading CV preview…' : 'Click to upload a CV'}
            </p>
          </button>
        )}
      </div>
    </div>
  );
};

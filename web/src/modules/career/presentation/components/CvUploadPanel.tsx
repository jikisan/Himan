import { Download, FileX2, Link2, ListOrdered, Printer, ShieldOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui';

interface CvUploadPanelProps {
  hasCv: boolean;
  cvPreviewHtml: string | null;
  hasProfileContent: boolean;
  onRemove: () => Promise<void>;
  onCopyLink: () => Promise<void>;
  onDownload: () => Promise<void>;
  onPrint: () => void;
  onEditLayout: () => void;
  hasShareLink: boolean;
  onRevokeLink: () => void;
  isSaving: boolean;
}

// Preview relies on the browser's native renderer (iframe) for the generated
// HTML résumé. The CV file itself is produced by saving a layout ("Edit CV
// layout"), which bakes cv.html into storage — there is no separate generate
// step here.
export const CvUploadPanel = ({ hasCv, cvPreviewHtml, hasProfileContent, onRemove, onCopyLink, onDownload, onPrint, onEditLayout, hasShareLink, onRevokeLink, isSaving }: CvUploadPanelProps) => {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-muted-foreground">CV</h3>
        <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
          <span title={!hasProfileContent ? 'Add your profile details first' : 'Edit CV layout'}>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit CV layout" onClick={onEditLayout} disabled={!hasProfileContent}>
              <ListOrdered className="h-4 w-4" />
            </Button>
          </span>
          <div className="w-px h-4 bg-border mx-0.5" />
          <span title={!hasCv ? 'Save a CV layout first' : undefined}>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Copy CV link" onClick={onCopyLink} disabled={!hasCv}>
              <Link2 className="h-4 w-4" />
            </Button>
          </span>
          <span title={!hasCv ? 'Save a CV layout first' : undefined}>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Download CV" onClick={onDownload} disabled={!hasCv}>
              <Download className="h-4 w-4" />
            </Button>
          </span>
          <span title={!hasCv ? 'Save a CV layout first' : undefined}>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Print / Save PDF" onClick={onPrint} disabled={!hasCv}>
              <Printer className="h-4 w-4" />
            </Button>
          </span>
          <span title={!hasShareLink ? 'No CV link to revoke yet' : undefined}>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Revoke CV link" onClick={onRevokeLink} disabled={!hasShareLink}>
              <ShieldOff className="h-4 w-4" />
            </Button>
          </span>
          <div className="w-px h-4 bg-border mx-0.5" />
          <span title={!hasCv ? 'Save a CV layout first' : isSaving ? 'Saving…' : undefined}>
            <Button variant="ghost" size="icon" className="h-7 w-7" title="Remove CV" onClick={onRemove} disabled={!hasCv || isSaving}>
              <FileX2 className="h-4 w-4" />
            </Button>
          </span>
        </div>
      </div>

      <div
        className={
          cvPreviewHtml
            ? 'rounded-lg border border-border bg-muted/30 overflow-hidden'
            : 'rounded-lg border border-dashed border-border bg-muted/20 overflow-hidden'
        }
        style={{ aspectRatio: '210 / 297' }}
      >
        {cvPreviewHtml ? (
          <iframe srcDoc={cvPreviewHtml} title="CV preview" sandbox="allow-same-origin" className="w-full h-full" />
        ) : (
          <button
            type="button"
            onClick={onEditLayout}
            disabled={!hasProfileContent || hasCv}
            className="h-full w-full flex flex-col items-center justify-center gap-2 p-4 text-center disabled:cursor-default"
          >
            <ListOrdered className="h-5 w-5 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {hasCv ? 'Loading CV preview…' : hasProfileContent ? 'Build a CV layout to generate your CV' : 'Add your profile details first'}
            </p>
            {!hasProfileContent && (
              <Link to="/profile" className="text-xs text-primary underline underline-offset-2">
                Go to profile
              </Link>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

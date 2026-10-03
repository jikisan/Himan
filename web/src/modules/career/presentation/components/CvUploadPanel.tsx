import { Download, FileText, FileX2, Link2, LoaderCircle, MoreHorizontal, Pencil, ShieldOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui';

interface CvUploadPanelProps {
  hasCv: boolean;
  cvPreviewUrl: string | null;
  hasProfileContent: boolean;
  onRemove: () => Promise<void>;
  onCopyLink: () => Promise<void>;
  onDownload: () => Promise<void>;
  onEditLayout: () => void;
  hasShareLink: boolean;
  onRevokeLink: () => void;
  isSaving: boolean;
}

// The preview embeds the saved PDF, exactly as a recruiter receives it.
export const CvUploadPanel = ({ hasCv, cvPreviewUrl, hasProfileContent, onRemove, onCopyLink, onDownload, onEditLayout, hasShareLink, onRevokeLink, isSaving }: CvUploadPanelProps) => (
  <section>
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 sm:px-6">
      <div>
        <h3 className="text-sm font-semibold">Curriculum vitae</h3>
        <p className="mt-1 text-xs text-muted-foreground">{isSaving ? 'Saving your CV…' : hasCv ? 'Preview of your saved PDF' : 'Built from your profile, tailored by you'}</p>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <span title={!hasProfileContent ? 'Add your profile details first' : undefined}>
          <Button variant="outline" className="h-11 px-3" onClick={onEditLayout} disabled={!hasProfileContent || isSaving}>
            <Pencil className="size-4" /> {hasCv ? 'Edit layout' : 'Build CV'}
          </Button>
        </span>
        <span title={!hasCv ? 'Save a CV layout first' : undefined}>
          <Button variant="ghost" size="icon" className="size-11" aria-label="Copy CV link" onClick={onCopyLink} disabled={!hasCv || isSaving}><Link2 className="size-4" /></Button>
        </span>
        <span title={!hasCv ? 'Save a CV layout first' : undefined}>
          <Button variant="ghost" size="icon" className="size-11" aria-label="Download CV" onClick={onDownload} disabled={!hasCv || isSaving}><Download className="size-4" /></Button>
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-11" aria-label="More CV actions"><MoreHorizontal className="size-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={onRevokeLink} disabled={!hasShareLink || isSaving} className="min-h-11 gap-2"><ShieldOff className="size-4" /> Revoke share links</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => { void onRemove(); }} disabled={!hasCv || isSaving} className="min-h-11 gap-2 text-destructive"><FileX2 className="size-4" /> Remove CV</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>

    <div className="bg-background/60 p-4 sm:p-6">
      {cvPreviewUrl ? (
        <div className="overflow-hidden rounded-sm border border-border bg-card shadow-sm" style={{ aspectRatio: '210 / 297' }}>
          <iframe src={cvPreviewUrl} title="CV preview" className="h-full w-full border-0" />
        </div>
      ) : (
        <div className="flex min-h-[28rem] flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-12 text-center">
          <div className="mb-5 flex size-14 items-center justify-center rounded-2xl border border-border bg-card text-primary">
            {hasCv ? <LoaderCircle className="size-6 animate-spin motion-reduce:animate-none" /> : <FileText className="size-6" />}
          </div>
          <h4 className="text-base font-semibold">{hasCv ? 'Loading your CV' : 'A CV for this opportunity.'}</h4>
          <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">
            {hasCv ? 'Your saved PDF will appear here.' : hasProfileContent ? 'Choose the experience, skills and projects that tell the right story.' : 'Add your experience, skills and projects to your profile to build your first CV.'}
          </p>
          {!hasCv && (
            hasProfileContent ? (
              <Button variant="outline" className="mt-5 h-11" onClick={onEditLayout} disabled={isSaving}><Pencil className="size-4" /> Build your CV</Button>
            ) : (
              <Button variant="outline" className="mt-5 h-11" asChild><Link to="/profile">Complete your profile</Link></Button>
            )
          )}
        </div>
      )}
    </div>
  </section>
);

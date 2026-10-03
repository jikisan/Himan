import { useRef, useState, type ChangeEvent } from 'react';
import { ExternalLink, Globe, Link2, Upload, UserRound } from 'lucide-react';
import { ProjectMediaService } from '@himan/shared/profile';
import type { UpdateCareerItemDto } from '@himan/shared/career';
import { useAuth } from '@auth/presentation/hooks';
import { toast } from 'sonner';
import { Button, Label, Switch } from '@/components/ui';

interface PortfolioSharePanelProps {
  shareToken: string;
  enabled: boolean;
  showEmail: boolean;
  portraitPath: string | null;
  onChange: (dto: UpdateCareerItemDto) => Promise<unknown>;
}

const media = new ProjectMediaService();

// The portfolio follows the projects, experience and skills in this CV layout.
export const PortfolioSharePanel = ({ shareToken, enabled, showEmail, portraitPath, onChange }: PortfolioSharePanelProps) => {
  const { user } = useAuth();
  const input = useRef<HTMLInputElement>(null);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const url = `${window.location.origin}/p/${shareToken}`;
  const portraitUrl = portraitPath ? ProjectMediaService.publicUrl(portraitPath) : null;

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !user || savingPhoto) return;
    if (!ProjectMediaService.acceptedTypes.includes(file.type) || file.size > 5 * 1024 * 1024) {
      toast.error('Choose a PNG, JPEG or WebP photo up to 5 MB');
      return;
    }
    setSavingPhoto(true);
    let uploaded: string | undefined;
    try {
      uploaded = await media.upload(user.id, new Uint8Array(await file.arrayBuffer()), file.type);
      await onChange({ portfolioPortraitPath: uploaded });
      if (portraitPath) await media.remove([portraitPath]);
      toast.success('Portfolio photo saved');
    } catch {
      if (uploaded) await media.remove([uploaded]);
      toast.error('Could not save your photo. Try again.');
    } finally {
      setSavingPhoto(false);
    }
  };

  const handleRemove = async () => {
    if (!portraitPath || savingPhoto) return;
    setSavingPhoto(true);
    try {
      await onChange({ portfolioPortraitPath: null });
      await media.remove([portraitPath]);
      toast.success('Portfolio photo removed');
    } catch {
      toast.error('Could not remove your photo. Try again.');
    } finally {
      setSavingPhoto(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    toast.success('Portfolio link copied');
  };

  return (
    <section className="order-last lg:order-none overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center gap-3 border-b border-border px-5 py-4">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><Globe className="size-4" /></div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold">Portfolio</h3>
          <p className="text-xs text-muted-foreground">Your work, in one link</p>
        </div>
        <span className={`rounded-full px-2 py-1 text-[11px] font-medium ${enabled ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-background text-muted-foreground'}`}>{enabled ? 'Live' : 'Off'}</span>
      </div>

      <div className="space-y-4 p-5">
        <p className="text-xs leading-5 text-muted-foreground">Your summary, projects, experience and skills follow your CV layout.</p>
        <div className="space-y-3 rounded-lg border border-border bg-background p-3" aria-busy={savingPhoto}>
          <div className="flex items-center gap-3">
            {portraitUrl ? <img src={portraitUrl} alt="Portfolio photo preview" className="size-14 shrink-0 rounded-full bg-muted object-cover" /> : (
              <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground" aria-hidden><UserRound className="size-6" /></span>
            )}
            <div>
              <p className="text-sm font-medium">Hero photo</p>
              <p className="text-xs leading-5 text-muted-foreground">{portraitUrl ? 'PNG, JPEG or WebP · Up to 5 MB' : 'Add your photo · Up to 5 MB'}</p>
            </div>
          </div>
          <input ref={input} type="file" accept={ProjectMediaService.acceptedTypes.join(',')} aria-label="Upload hero photo" className="sr-only" tabIndex={-1} disabled={savingPhoto || !user} onChange={handleUpload} />
          <Button variant="outline" className="h-11 w-full" disabled={savingPhoto || !user} onClick={() => input.current?.click()}>
            <Upload className="size-4" /> {savingPhoto ? 'Saving photo…' : portraitUrl ? 'Change photo' : 'Add photo'}
          </Button>
          {portraitPath && <Button variant="ghost" className="h-11 w-full text-xs" disabled={savingPhoto} onClick={handleRemove}>Remove photo</Button>}
        </div>
        <div className="flex min-h-11 items-center justify-between gap-4">
          <Label htmlFor="portfolio-enabled" className="cursor-pointer">Public portfolio link</Label>
          <Switch id="portfolio-enabled" checked={enabled} onCheckedChange={(checked) => onChange({ portfolioEnabled: checked })} />
        </div>
        <div className="flex min-h-11 items-center justify-between gap-4 border-t border-border pt-4">
          <div className="space-y-1">
            <Label htmlFor="portfolio-email" className="cursor-pointer">Show my email</Label>
            <p className="text-xs text-muted-foreground">Your phone number stays private.</p>
          </div>
          <Switch id="portfolio-email" checked={showEmail} disabled={!enabled} onCheckedChange={(checked) => onChange({ portfolioShowEmail: checked })} />
        </div>
        {enabled && <p title={url} className="truncate rounded-lg border border-border bg-background px-3 py-2.5 text-xs text-muted-foreground">{url}</p>}
        <div className="flex gap-2">
          <Button variant="outline" className="h-11 flex-1 px-3" onClick={handleCopy} disabled={!enabled}><Link2 className="size-4" /> Copy link</Button>
          <Button variant="outline" size="icon" className="size-11 shrink-0" aria-label="Open portfolio" disabled={!enabled} asChild={enabled}>
            {enabled ? <a href={url} target="_blank" rel="noreferrer"><ExternalLink className="size-4" /></a> : <ExternalLink className="size-4" />}
          </Button>
        </div>
        <p className="text-xs leading-5 text-muted-foreground">Anyone with the link can view it. Revoking share links also retires this portfolio link.</p>
      </div>
    </section>
  );
};

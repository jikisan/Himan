import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { ExternalLink, Link2, Upload, UserRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { ProfileRepository, ProjectMediaService } from '@himan/shared/profile';
import { portfolioPath, slugify, SLUG_PATTERN, type UpdateCareerItemDto } from '@himan/shared/career';
import { profileKeys } from '../../../profile/presentation/hooks';
import { useAuth } from '@auth/presentation/hooks';
import { CompressionService } from '@storage/infrastructure';
import { toast } from 'sonner';
import { Button, Label, Switch } from '@/components/ui';

interface PortfolioSharePanelProps {
  shareToken: string;
  slug: string;
  handle: string | null;
  enabled: boolean;
  showEmail: boolean;
  showCv: boolean;
  hasCv: boolean;
  portraitPath: string | null;
  onChange: (dto: UpdateCareerItemDto) => Promise<unknown>;
}

const media = new ProjectMediaService();
const profiles = new ProfileRepository();

// Keep typing natural (spaces become hyphens) without trimming a trailing
// hyphen mid-word; the full rules apply on save.
const draftSlug = (value: string) => value.toLowerCase().replace(/[^a-z0-9-]+/g, '-').slice(0, 40);

// Keyed by the saved handle and slug, so the drafts reset after each save.
const PortfolioLinkForm = ({ slug, handle, onChange }: Pick<PortfolioSharePanelProps, 'slug' | 'handle' | 'onChange'>) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [handleDraft, setHandleDraft] = useState(handle ?? '');
  const [slugDraft, setSlugDraft] = useState(slug);
  const [savingLink, setSavingLink] = useState(false);
  const linkDirty = handleDraft !== (handle ?? '') || slugDraft !== slug;

  const handleSaveLink = async (event: FormEvent) => {
    event.preventDefault();
    const nextHandle = slugify(handleDraft);
    const nextSlug = slugify(slugDraft);
    if (nextHandle.length < 3 || !SLUG_PATTERN.test(nextHandle) || !SLUG_PATTERN.test(nextSlug)) {
      toast.error('Use letters, numbers and hyphens. Your handle needs at least 3 characters.');
      return;
    }
    if (!user || savingLink) return;
    setSavingLink(true);
    try {
      if (nextHandle !== handle) {
        try {
          await profiles.upsert({ userId: user.id, handle: nextHandle });
        } catch {
          toast.error(`The handle "${nextHandle}" is taken. Try another.`);
          return;
        }
        await queryClient.invalidateQueries({ queryKey: profileKeys.all });
      }
      if (nextSlug !== slug) await onChange({ portfolioSlug: nextSlug });
      toast.success('Portfolio link saved. The old link no longer works.');
    } catch {
      // updateItem already reported the failure; a duplicate slug lands here.
    } finally {
      setSavingLink(false);
    }
  };

  return (
    <form onSubmit={handleSaveLink} className="space-y-2">
      <div className="flex min-h-11 items-center rounded-lg border border-border bg-background px-3 text-xs text-muted-foreground focus-within:ring-2 focus-within:ring-ring">
        <span className="shrink-0">/p/</span>
        <input aria-label="Your handle" value={handleDraft} onChange={(e) => setHandleDraft(draftSlug(e.target.value))} placeholder="handle" className="field-sizing-content min-w-[4ch] max-w-[45%] bg-transparent py-2.5 text-foreground outline-none" />
        <span className="shrink-0 px-0.5">/</span>
        <input aria-label="Portfolio slug" value={slugDraft} onChange={(e) => setSlugDraft(draftSlug(e.target.value))} placeholder="android-developer" className="min-w-0 flex-1 bg-transparent py-2.5 text-foreground outline-none" />
      </div>
      {linkDirty ? (
        <Button type="submit" variant="outline" className="h-11 w-full" disabled={savingLink}>{savingLink ? 'Saving link…' : 'Save link'}</Button>
      ) : (
        <p className="text-xs leading-5 text-muted-foreground">Your handle is shared by all your portfolio links.</p>
    )}
    </form>
  );
};

// The portfolio follows the projects, experience and skills in this CV layout.
export const PortfolioSharePanel = ({ shareToken, slug, handle, enabled, showEmail, showCv, hasCv, portraitPath, onChange }: PortfolioSharePanelProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [savingPhoto, setSavingPhoto] = useState(false);
  const url = `${window.location.origin}${portfolioPath({ shareToken, portfolioSlug: slug }, handle)}`;
  const portraitUrl = portraitPath ? ProjectMediaService.publicUrl(portraitPath) : null;
  // Stored on the profile, so one photo serves every career's portfolio.
  const savePortrait = async (path: string | null) => {
    await profiles.upsert({ userId: user!.id, portfolioPortraitPath: path });
    await queryClient.invalidateQueries({ queryKey: profileKeys.all });
  };

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
      const compressed = await CompressionService.compress(file);
      uploaded = await media.upload(user.id, new Uint8Array(await compressed.arrayBuffer()), compressed.type);
      await savePortrait(uploaded);
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
      await savePortrait(null);
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
    <section aria-label="Portfolio settings" className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="space-y-4 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold">Public link</h2>
            <p className="mt-1 text-xs text-muted-foreground">{enabled ? 'Anyone with the link can view it.' : 'Off. Nobody can open your portfolio.'}</p>
          </div>
          <Switch id="portfolio-enabled" aria-label="Public portfolio link" checked={enabled} onCheckedChange={(checked) => onChange({ portfolioEnabled: checked })} />
        </div>
        {enabled && (
          <>
            <PortfolioLinkForm key={`${handle}|${slug}`} slug={slug} handle={handle} onChange={onChange} />
            <div className="flex gap-2">
              <Button className="h-10 flex-1 px-3" onClick={handleCopy}><Link2 className="size-4" /> Copy link</Button>
              <Button variant="outline" className="h-10 px-3" asChild>
                <a href={url} target="_blank" rel="noreferrer"><ExternalLink className="size-4" /> Open</a>
              </Button>
            </div>
          </>
        )}
      </div>

      <div className="space-y-4 border-t border-border p-5" aria-busy={savingPhoto}>
        <h2 className="text-sm font-semibold">Appearance</h2>
        <div className="flex items-center gap-3">
          {portraitUrl ? <img src={portraitUrl} alt="Portfolio photo preview" className="size-12 shrink-0 rounded-full bg-muted object-cover" /> : (
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground" aria-hidden><UserRound className="size-5" /></span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Hero photo</p>
            <p className="text-xs text-muted-foreground">{savingPhoto ? 'Saving…' : 'Shown on all your portfolios'}</p>
          </div>
          <input ref={input} type="file" accept={ProjectMediaService.acceptedTypes.join(',')} aria-label="Upload hero photo" className="sr-only" tabIndex={-1} disabled={savingPhoto || !user} onChange={handleUpload} />
          <Button variant="outline" className="h-9 px-3" disabled={savingPhoto || !user} onClick={() => input.current?.click()}>
            <Upload className="size-4" /> {portraitUrl ? 'Change' : 'Add photo'}
          </Button>
        </div>
        {portraitPath && (
          <button type="button" disabled={savingPhoto} onClick={handleRemove} className="-mt-2 ml-15 text-xs text-muted-foreground underline-offset-4 hover:text-destructive hover:underline disabled:opacity-50">Remove photo</button>
        )}
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="portfolio-email" className="cursor-pointer">Show my email</Label>
            <p className="mt-1 text-xs text-muted-foreground">The page never shows your phone number.</p>
          </div>
          <Switch id="portfolio-email" checked={showEmail} onCheckedChange={(checked) => onChange({ portfolioShowEmail: checked })} />
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="portfolio-cv" className="cursor-pointer">Offer CV download</Label>
            <p className="mt-1 text-xs text-muted-foreground">{hasCv ? 'The PDF includes your phone number.' : 'Build a CV in the CV tab first.'}</p>
          </div>
          <Switch id="portfolio-cv" checked={hasCv && showCv} disabled={!hasCv} onCheckedChange={(checked) => onChange({ portfolioShowCv: checked })} />
        </div>
      </div>

      <p className="border-t border-border bg-background/50 px-5 py-3 text-xs leading-5 text-muted-foreground">
        Projects, experience and skills follow your CV layout.{' '}
        <Link to="/profile" className="font-medium text-primary underline-offset-4 hover:underline">Edit profile</Link>
      </p>
    </section>
  );
};

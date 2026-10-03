import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Blocks, BriefcaseBusiness, Check, ChevronDown, ChevronRight, Copy, FileText, Globe, Mail, MoreHorizontal, Pencil, Printer, ScanText, ShieldOff, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import {
  Button,
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Label,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@auth/presentation/hooks';
import { useCareerItems } from '../hooks/useCareerItems';
import { useItemBlocks } from '../hooks/useItemBlocks';
import { useCareerBlocks } from '../hooks/useCareerBlocks';
import { useCvBlocks } from '../hooks/useCvBlocks';
import { useGenerateLetter } from '../hooks/useGenerateLetter';
import { useCvData } from '../hooks/useCvData';
import { ComposePane, type SelectedBlock } from '../components/ComposePane';
import { CvComposePane } from '../components/CvComposePane';
import { LetterPreview } from '../components/LetterPreview';
import { renderHighlightedLetterText } from '../utils/renderHighlightedLetterText';
import { CvUploadPanel } from '../components/CvUploadPanel';
import { AtsPanel } from '../components/AtsPanel';
import { PortfolioSharePanel } from '../components/PortfolioSharePanel';
import { PortfolioPreview } from '../components/PortfolioPreview';
import { CvPreviewFrame } from '../components/CvPreviewFrame';
import { generateCvPdfBlob } from '../utils/generateCvPdf';
import { CareerStorageService } from '../../infrastructure';
import { buildStoragePath, portfolioPath, type CareerLength, type ComposableBlock, type CvBlockRef } from '@himan/shared/career';
import { renderCvHtml, type RenderCvBlock } from '@himan/shared/profile';
import { Logger } from '@core/infrastructure/services';

// Used only inside the blocks dialog, where the actual job title/company
// aren't known yet — the point there is to sanity-check block order, not
// preview real content.
const SAMPLE_CTX = {
  jobTitle: 'Senior Software Engineer',
  company: 'Acme Corp',
  hiringManager: undefined,
  hook: undefined,
};

export const ItemEditorPage = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, createItem, updateItem, rotateShareLink } = useCareerItems();
  const { blocks: allBlocks } = useCareerBlocks();
  const { itemBlocks, saveItemBlocks, isSaving } = useItemBlocks(itemId);
  const { cvData, profileBlocks, defaultLayout, hasContent: hasProfileContent } = useCvData();
  const { blocks: cvBlocks } = useCvBlocks();

  const item = items.find((i) => i.id === itemId) ?? null;
  const isNew = !itemId;

  const [name, setName] = useState('');
  const [activeDocument, setActiveDocument] = useState('cv');
  const [selection, setSelection] = useState<SelectedBlock[]>([]);
  const [blocksDialogOpen, setBlocksDialogOpen] = useState(false);
  const [cvLayoutDialogOpen, setCvLayoutDialogOpen] = useState(false);
  const [cvLayoutDraft, setCvLayoutDraft] = useState<CvBlockRef[]>([]);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [isGeneratingCv, setIsGeneratingCv] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync form when a different item loads
    if (item) setName(item.name);
  }, [item]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- sync selection when item blocks load
    setSelection(itemBlocks.map((b) => ({ blockId: b.blockId, length: b.length })));
  }, [itemBlocks]);

  // Resolves stored refs against live data: 'custom' refs carry only an id,
  // so their title/body come from the current CV block library — editing a
  // custom block once updates every item that includes it on next generate.
  const resolveCvLayout = (refs: CvBlockRef[]): RenderCvBlock[] =>
    refs.flatMap((ref): RenderCvBlock[] => {
      if (ref.type === 'custom') {
        const block = cvBlocks.find((b) => b.id === ref.id);
        return block ? [{ type: 'custom', title: block.title, body: block.body }] : [];
      }
      return [ref];
    });

  const cvLayoutPreviewHtml = cvData ? renderCvHtml(cvData, resolveCvLayout(cvLayoutDraft), item?.name) : '';

  // Scored against the saved layout — the CV a recruiter actually receives —
  // not the unsaved draft sitting in the layout dialog.
  const savedCvHtml = cvData ? renderCvHtml(cvData, resolveCvLayout(item?.cvLayout ?? defaultLayout), item?.name) : '';
  const [cvPreviewUrl, setCvPreviewUrl] = useState<string | null>(null);

  // The main panel shows the actual stored cv.pdf (signed URL), not a fresh
  // re-render — so it never drifts from what a recruiter actually receives.
  // Only the layout-editing dialog re-renders live from the draft selection.
  useEffect(() => {
    if (!item?.cvFilePath) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear preview when the CV file is removed
      setCvPreviewUrl(null);
      return;
    }
    let cancelled = false;
    new CareerStorageService()
      .createShareUrl(item.cvFilePath)
      .then((url) => {
        if (!cancelled) setCvPreviewUrl(url);
      })
      .catch((err) => Logger.error('Error loading CV preview', err));
    return () => {
      cancelled = true;
    };
  }, [item?.cvFilePath]);

  const previewBlocks: ComposableBlock[] = selection.map((s, index) => {
    const block = allBlocks.find((b) => b.id === s.blockId);
    return { blockId: s.blockId, position: index, length: s.length, body: block?.body ?? '' };
  });

  const generate = useGenerateLetter(item, previewBlocks, cvData?.profile.handle ?? null);

  const missingFields = [
    !generate.jobTitle.trim() && 'job title',
    !generate.company.trim() && 'company',
  ].filter((v): v is string => !!v);
  const generateDisabledReason = generate.canGenerate
    ? undefined
    : missingFields.length > 0
      ? `Enter ${missingFields.join(' and ')} first`
      : 'Select cover letter blocks first';

  const handleCreate = async () => {
    if (!name.trim()) return;
    const created = await createItem({ name: name.trim() });
    if (created) navigate(`/career/${created.id}`, { replace: true });
  };

  const handleSaveSelection = async () => {
    await saveItemBlocks(selection.map((s, index) => ({ blockId: s.blockId, position: index, length: s.length })));
    setBlocksDialogOpen(false);
  };

  const handleSaveName = async () => {
    if (!item || !name.trim() || name === item.name) return;
    await updateItem(item.id, { name: name.trim() });
  };

  const handleRemoveCv = async () => {
    if (!item) return;
    await updateItem(item.id, { cvFilePath: null });
  };

  const handleRevoke = async () => {
    if (!item) return;
    await rotateShareLink(item.id);
    setRevokeOpen(false);
    toast.success('Old CV and portfolio links revoked. Copy new links to hand them out again.');
  };

  const handleCopyText = async () => {
    await navigator.clipboard.writeText(generate.text);
    toast.success('Cover letter text copied');
  };

  const handleCopyCvLink = async () => {
    if (!item?.cvFilePath) return;
    // Short link resolved server-side by functions/cv/[token].ts — no signed
    // URL baked into the copied text, so it stays short and rotation revokes it.
    await navigator.clipboard.writeText(`${window.location.origin}/cv/${item.shareToken}`);
    toast.success('CV link copied');
  };

  // {fullName}_CV_{item}.pdf, e.g. June_Kyle_Santerna_CV_Android.pdf.
  const cvDownloadName = () => {
    const slug = (s: string) => s.trim().replace(/[^\w]+/g, '_').replace(/^_+|_+$/g, '');
    const parts = [slug(cvData?.profile.fullName ?? ''), 'CV', slug(item?.name ?? '')];
    return `${parts.filter(Boolean).join('_')}.pdf`;
  };

  const handleDownloadCv = async () => {
    if (!item?.cvFilePath) return;
    try {
      const url = await new CareerStorageService().createShareUrl(item.cvFilePath, cvDownloadName());
      window.open(url, '_blank');
    } catch (err) {
      Logger.error('Error downloading CV', err);
      toast.error('Failed to download CV');
    }
  };

  const handleOpenCvLayout = () => {
    setCvLayoutDraft(item?.cvLayout ?? defaultLayout);
    setCvLayoutDialogOpen(true);
  };

  // Saving the layout also bakes it into cv.html in storage — the share
  // link/download/print all serve that stored file, so there is no separate
  // "generate" step.
  const handleSaveCvLayout = async () => {
    if (!item || !user || !cvData) return;
    setIsGeneratingCv(true);
    try {
      await updateItem(item.id, { cvLayout: cvLayoutDraft });
      const html = renderCvHtml(cvData, resolveCvLayout(cvLayoutDraft), item.name);
      const blob = await generateCvPdfBlob(html);
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const path = buildStoragePath(user.id, item.shareToken, 'cv.pdf');
      await new CareerStorageService().upload(path, bytes, 'application/pdf');
      await updateItem(item.id, { cvFilePath: path });
      setCvLayoutDialogOpen(false);
    } catch (err) {
      Logger.error('Error saving CV layout', err);
      toast.error('Failed to save CV');
    } finally {
      setIsGeneratingCv(false);
    }
  };

  const handlePrint = () => {
    if (!generate.canGenerate) return;
    const iframe = iframeRef.current;
    if (!iframe) return;
    iframe.onload = () => {
      iframe.contentWindow?.print();
    };
    iframe.srcdoc = generate.printHtml();
  };

  if (isNew) {
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="px-4 py-3.5 border-b border-border flex items-center gap-3">
          <Link to="/career" className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-accent transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-semibold">New Career</h1>
        </div>
        <div className="p-4 max-w-md space-y-3">
          <Input
            placeholder="Android Developer"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
            autoFocus
          />
          <Button onClick={handleCreate} disabled={!name.trim()}>
            Create
          </Button>
        </div>
      </div>
    );
  }

  if (!item) return null;

  const tabs = [
    { value: 'cv', label: 'CV', Icon: FileText, live: !!item.cvFilePath },
    { value: 'letter', label: 'Cover letter', Icon: Mail, live: false },
    { value: 'portfolio', label: 'Portfolio', Icon: Globe, live: item.portfolioEnabled },
    { value: 'ats', label: 'ATS check', Icon: ScanText, live: false },
  ];
  const portfolioUrl = portfolioPath(item, cvData?.profile.handle ?? null);

  return (
    <Tabs value={activeDocument} onValueChange={setActiveDocument} className="flex h-full min-h-0 flex-col gap-0 bg-background [&_button]:hover:scale-100">
      <header className="shrink-0 border-b border-border bg-card px-4 pt-4 sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <Link to="/career" aria-label="Back to career" className="-ml-2.5 flex size-10 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <ArrowLeft className="size-4" />
          </Link>
          <div className="group relative min-w-0 flex-1">
            <h1 className="sr-only">{item.name}</h1>
            <Input
              aria-label="Career name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={handleSaveName}
              onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
              className="h-10 w-full max-w-lg truncate rounded-md border-transparent bg-transparent px-2 text-xl! font-semibold tracking-tight shadow-none hover:border-input focus-visible:border-input"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-10 shrink-0" aria-label="More options"><MoreHorizontal className="size-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild className="min-h-10 gap-2"><Link to="/career/blocks"><Blocks className="size-4" /> Letter block library</Link></DropdownMenuItem>
              <DropdownMenuItem asChild className="min-h-10 gap-2"><Link to="/profile"><UserRound className="size-4" /> Edit profile</Link></DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setRevokeOpen(true)} disabled={!item.shareToken} className="min-h-10 gap-2"><ShieldOff className="size-4" /> Revoke share links</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <TabsList aria-label="Application documents" className="mx-auto mt-3 flex h-auto w-full max-w-6xl justify-start gap-1 overflow-x-auto rounded-none bg-transparent p-0 [scrollbar-width:none]">
          {tabs.map(({ value, label, Icon, live }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="relative h-11 flex-none gap-2 rounded-none border-0 bg-transparent px-2.5 sm:px-3 text-muted-foreground shadow-none after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-transparent hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none data-[state=active]:after:bg-primary"
            >
              <Icon className="hidden size-4 sm:block" />
              {label}
              {live && <span className="size-1.5 rounded-full bg-emerald-500" aria-label="Live" />}
            </TabsTrigger>
          ))}
        </TabsList>
      </header>

      <ScrollArea className="min-h-0 flex-1">
        <div className="px-4 py-6 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-6xl">
          <TabsContent value="cv" className="mt-0">
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <CvUploadPanel
                hasCv={!!item.cvFilePath}
                cvPreviewUrl={cvPreviewUrl}
                hasProfileContent={hasProfileContent}
                onRemove={handleRemoveCv}
                onCopyLink={handleCopyCvLink}
                onDownload={handleDownloadCv}
                onEditLayout={handleOpenCvLayout}
                hasShareLink={!!item.shareToken}
                onRevokeLink={() => setRevokeOpen(true)}
                isSaving={isGeneratingCv}
              />
            </div>
          </TabsContent>

          <TabsContent value="letter" className="mt-0">
            <div className="grid items-start gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
            <section aria-label="Letter details" className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <div className="flex items-center gap-3 border-b border-border px-5 py-4">
                <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <BriefcaseBusiness className="size-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold">Letter details</h2>
                  <p className="text-xs text-muted-foreground">Personalize your cover letter</p>
                </div>
              </div>
              <div className="space-y-4 p-5">
                <div className="space-y-2">
                  <Label htmlFor="jobTitle">Job title <span className="text-muted-foreground">*</span></Label>
                  <Input id="jobTitle" required value={generate.jobTitle} onChange={(e) => generate.setJobTitle(e.target.value)} placeholder="Senior Software Engineer" className="h-11 bg-background/50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company <span className="text-muted-foreground">*</span></Label>
                  <Input id="company" required value={generate.company} onChange={(e) => generate.setCompany(e.target.value)} placeholder="Acme Corp" className="h-11 bg-background/50" />
                </div>
                <button
                  type="button"
                  onClick={() => setAdvancedOpen(!advancedOpen)}
                  aria-expanded={advancedOpen}
                  aria-controls="letter-options"
                  className="flex min-h-11 w-full items-center justify-between rounded-md text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Recipient, length &amp; hook
                  {advancedOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                </button>
                {advancedOpen && (
                  <div id="letter-options" className="space-y-4 border-t border-border pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="hiringManager">Recipient (optional)</Label>
                      <Input id="hiringManager" value={generate.hiringManager} onChange={(e) => generate.setHiringManager(e.target.value)} placeholder="Hiring Team" className="h-11" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="length">Letter length</Label>
                      <Select value={generate.length} onValueChange={(v) => generate.setLength(v as CareerLength)}>
                        <SelectTrigger id="length" className="h-11"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="short">Short</SelectItem>
                          <SelectItem value="long">Long</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hook">Opening hook (optional)</Label>
                      <Input id="hook" value={generate.hook} onChange={(e) => generate.setHook(e.target.value)} placeholder="Why this opportunity?" className="h-11" />
                    </div>
                  </div>
                )}
              </div>
              <div className="border-t border-border bg-background/50 px-5 py-3 text-xs text-muted-foreground">
                These details update your letter preview only.
              </div>
            </section>

              <div className="min-w-0 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4 sm:px-6">
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold">Cover letter</h2>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground" role="status">
                      {generate.canGenerate && <Check className="size-3.5 text-emerald-600 dark:text-emerald-400" />}
                      {generate.canGenerate ? 'Ready to send' : generateDisabledReason}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" className="h-10 px-3" onClick={() => setBlocksDialogOpen(true)}><Pencil className="size-4" /> <span className="hidden sm:inline">Edit blocks</span></Button>
                    <span title={generateDisabledReason}>
                      <Button variant="outline" className="h-10 px-3" aria-label="Print or save cover letter as PDF" onClick={handlePrint} disabled={!generate.canGenerate}><Printer className="size-4" /> <span className="hidden sm:inline">PDF</span></Button>
                    </span>
                    <span title={generateDisabledReason}>
                      <Button className="h-10 px-4" aria-label="Copy cover letter" onClick={handleCopyText} disabled={!generate.canGenerate}><Copy className="size-4" /> Copy</Button>
                    </span>
                  </div>
                </div>
                <div className="bg-background/60 p-4 sm:p-6">
                  {generate.text.trim() ? (
                    <div className="mx-auto min-h-[32rem] max-w-3xl rounded-sm border border-border bg-card px-6 py-10 text-sm leading-7 whitespace-pre-wrap shadow-sm sm:px-12 sm:py-14">{renderHighlightedLetterText(generate.text)}</div>
                  ) : (
                    <div className="flex min-h-[28rem] flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 text-center">
                      <div className="mb-5 flex size-14 items-center justify-center rounded-2xl border border-border bg-card text-primary"><Mail className="size-6" /></div>
                      <h3 className="text-base font-semibold">Your next introduction starts here.</h3>
                      <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">{selection.length === 0 ? 'Choose your letter blocks, then add a job title and company to see your draft.' : 'Add a job title and company in Letter details to personalize your draft.'}</p>
                      {selection.length === 0 && <Button className="mt-5 h-10" onClick={() => setBlocksDialogOpen(true)}><Pencil className="size-4" /> Choose blocks</Button>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="portfolio" className="mt-0">
            <div className="grid items-start gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
              <PortfolioSharePanel
                shareToken={item.shareToken}
                slug={item.portfolioSlug}
                handle={cvData?.profile.handle ?? null}
                enabled={item.portfolioEnabled}
                showEmail={item.portfolioShowEmail}
                portraitPath={item.portfolioPortraitPath}
                onChange={(dto) => updateItem(item.id, dto)}
              />
              <PortfolioPreview url={item.portfolioEnabled ? portfolioUrl : null} version={item.updatedAt.getTime()} />
            </div>
          </TabsContent>

          <TabsContent value="ats" forceMount className="mt-0 data-[state=inactive]:hidden">
            <div className="mx-auto max-w-3xl rounded-xl border border-border bg-card p-5 shadow-sm sm:p-6">
              <AtsPanel cvHtml={savedCvHtml} />
            </div>
          </TabsContent>
        </div>
        </div>
      </ScrollArea>

      <Dialog open={blocksDialogOpen} onOpenChange={(open) => (open ? setBlocksDialogOpen(true) : handleSaveSelection())}>
        <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cover letter blocks — {item.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 lg:grid-cols-2">
            <ComposePane allBlocks={allBlocks} selected={selection} onChange={setSelection} />
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Preview (sample values)</h3>
              <LetterPreview blocks={previewBlocks} ctx={SAMPLE_CTX} length="long" />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveSelection} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save blocks'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={cvLayoutDialogOpen} onOpenChange={setCvLayoutDialogOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <DialogTitle>CV layout — {item.name}</DialogTitle>
            <Button onClick={handleSaveCvLayout} disabled={isGeneratingCv || !hasProfileContent}>
              {isGeneratingCv ? 'Saving…' : 'Save & generate CV'}
            </Button>
          </DialogHeader>
          <div className="grid gap-6 lg:grid-cols-2">
            <CvComposePane
              profileBlocks={profileBlocks}
              customBlocks={cvBlocks}
              selected={cvLayoutDraft}
              onChange={setCvLayoutDraft}
            />
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Preview</h3>
              <div className="rounded-lg border border-border bg-muted/30 overflow-hidden">
                <CvPreviewFrame html={cvLayoutPreviewHtml} title="CV layout preview" />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={revokeOpen}
        onOpenChange={setRevokeOpen}
        title="Revoke CV link"
        description="The current CV and portfolio links will stop working immediately. The CV itself is kept — copy new links from this page to share them at fresh URLs."
        confirmText="Revoke"
        onConfirm={handleRevoke}
        variant="destructive"
      />

      {/* Hidden same-origin iframe: the app document itself is never printed. */}
      <iframe ref={iframeRef} title="print-letter" className="hidden" />
    </Tabs>
  );
};

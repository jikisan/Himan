import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, ChevronDown, ChevronRight, Copy, Pencil, Printer } from 'lucide-react';
import { toast } from 'sonner';
import {
  Button,
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
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
import { CvPreviewFrame } from '../components/CvPreviewFrame';
import { generateCvPdfBlob } from '../utils/generateCvPdf';
import { CareerStorageService } from '../../infrastructure';
import { buildStoragePath, type CareerLength, type ComposableBlock, type CvBlockRef } from '@himan/shared/career';
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
  const [selection, setSelection] = useState<SelectedBlock[]>([]);
  const [blocksDialogOpen, setBlocksDialogOpen] = useState(false);
  const [cvLayoutDialogOpen, setCvLayoutDialogOpen] = useState(false);
  const [cvLayoutDraft, setCvLayoutDraft] = useState<CvBlockRef[]>([]);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [isGeneratingCv, setIsGeneratingCv] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (item) setName(item.name);
  }, [item]);

  useEffect(() => {
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

  const itemCvLayout = item?.cvLayout ? resolveCvLayout(item.cvLayout) : null;
  const cvLayoutPreviewHtml = cvData ? renderCvHtml(cvData, resolveCvLayout(cvLayoutDraft)) : '';
  // Preview and print share one render so they can never drift. Shown only
  // once a layout is saved (cvFilePath set); the stored cv.html the share
  // link serves is produced from the same inputs at save time.
  const cvHtml = cvData && item?.cvFilePath ? renderCvHtml(cvData, itemCvLayout) : null;

  const previewBlocks: ComposableBlock[] = selection.map((s, index) => {
    const block = allBlocks.find((b) => b.id === s.blockId);
    return { blockId: s.blockId, position: index, length: s.length, body: block?.body ?? '' };
  });

  const generate = useGenerateLetter(item, previewBlocks);

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
    toast.success('Old CV link revoked. Copy a new CV link to hand out the same file.');
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
      const html = renderCvHtml(cvData, resolveCvLayout(cvLayoutDraft));
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
          <h1 className="text-lg font-semibold">New item</h1>
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

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="px-4 py-3.5 border-b border-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Link to="/career" className="flex-shrink-0 h-9 w-9 flex items-center justify-center rounded-lg hover:bg-accent transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleSaveName}
            className="h-9 max-w-xs font-medium"
          />
        </div>
        <span
          className={
            generate.canGenerate
              ? 'flex-shrink-0 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 rounded-full px-2.5 py-1'
              : 'flex-shrink-0 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-500/10 rounded-full px-2.5 py-1'
          }
        >
          {generate.canGenerate ? 'Ready to generate' : generateDisabledReason}
        </span>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 max-w-5xl mx-auto grid gap-6 lg:grid-cols-2">
          <div>
            <CvUploadPanel
              hasCv={!!item.cvFilePath}
              cvPreviewHtml={cvHtml}
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

          <div className="lg:sticky lg:top-4 lg:self-start space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground">Cover letter</h3>
              <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
                <span title={generateDisabledReason}>
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Copy cover letter" onClick={handleCopyText} disabled={!generate.canGenerate}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </span>
                <span title={generateDisabledReason}>
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Print / Save PDF" onClick={handlePrint} disabled={!generate.canGenerate}>
                    <Printer className="h-4 w-4" />
                  </Button>
                </span>
                <div className="w-px h-4 bg-border mx-0.5" />
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit blocks" onClick={() => setBlocksDialogOpen(true)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-border p-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="jobTitle">
                    Job title
                    {generate.missing.includes('job_title') && <span className="text-destructive"> *</span>}
                  </Label>
                  <Input
                    id="jobTitle"
                    value={generate.jobTitle}
                    onChange={(e) => generate.setJobTitle(e.target.value)}
                    placeholder="Senior Software Engineer"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">
                    Company
                    {generate.missing.includes('company') && <span className="text-destructive"> *</span>}
                  </Label>
                  <Input
                    id="company"
                    value={generate.company}
                    onChange={(e) => generate.setCompany(e.target.value)}
                    placeholder="Acme Corp"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => setAdvancedOpen(!advancedOpen)}
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {advancedOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                Recipient, length &amp; hook
              </button>

              {advancedOpen && (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="hiringManager">Recipient (optional)</Label>
                      <Input
                        id="hiringManager"
                        value={generate.hiringManager}
                        onChange={(e) => generate.setHiringManager(e.target.value)}
                        placeholder="Falls back to “Hiring Team”"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="length">Length</Label>
                      <Select value={generate.length} onValueChange={(v) => generate.setLength(v as CareerLength)}>
                        <SelectTrigger id="length">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="short">Short</SelectItem>
                          <SelectItem value="long">Long</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hook">Hook (optional)</Label>
                    <Input
                      id="hook"
                      value={generate.hook}
                      onChange={(e) => generate.setHook(e.target.value)}
                      placeholder="Dropped entirely if left blank"
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-2">Preview</h3>
              <div className="rounded-lg border border-border p-3 bg-muted/30 max-h-[70vh] overflow-y-auto">
                {generate.text.trim() ? (
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">{renderHighlightedLetterText(generate.text)}</div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {selection.length === 0 ? 'No blocks set up yet — click "Edit blocks" to draft the letter.' : 'Fill in job title and company to preview the letter.'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>

      <Dialog open={blocksDialogOpen} onOpenChange={(open) => (open ? setBlocksDialogOpen(true) : handleSaveSelection())}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
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
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between gap-3">
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
        description="The current CV share link will stop working immediately. The CV itself is kept — copy a new CV link from this page to share it at a fresh URL."
        confirmText="Revoke"
        onConfirm={handleRevoke}
        variant="destructive"
      />

      {/* Hidden same-origin iframe: the app document itself is never printed. */}
      <iframe ref={iframeRef} title="print-letter" className="hidden" />
    </div>
  );
};

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, Copy, ListChecks, Printer, ShieldOff } from 'lucide-react';
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
import { useGenerateLetter } from '../hooks/useGenerateLetter';
import { ComposePane, type SelectedBlock } from '../components/ComposePane';
import { BlockSwapList } from '../components/BlockSwapList';
import { LetterPreview } from '../components/LetterPreview';
import { renderHighlightedLetterText } from '../utils/renderHighlightedLetterText';
import { CvUploadPanel } from '../components/CvUploadPanel';
import { CareerStorageService } from '../../infrastructure';
import { buildStoragePath, type CareerLength, type ComposableBlock } from '@himan/shared/career';
import { Logger } from '@core/infrastructure/services';
import { cn } from '@core/presentation/utils';

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

  const item = items.find((i) => i.id === itemId) ?? null;
  const isNew = !itemId;

  const [name, setName] = useState('');
  const [selection, setSelection] = useState<SelectedBlock[]>([]);
  const [blocksDialogOpen, setBlocksDialogOpen] = useState(false);
  const [revokeOpen, setRevokeOpen] = useState(false);
  const [isUploadingCv, setIsUploadingCv] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (item) setName(item.name);
  }, [item]);

  useEffect(() => {
    setSelection(itemBlocks.map((b) => ({ blockId: b.blockId, length: b.length })));
  }, [itemBlocks]);

  const previewBlocks: ComposableBlock[] = selection.map((s, index) => {
    const block = allBlocks.find((b) => b.id === s.blockId);
    return { blockId: s.blockId, position: index, length: s.length, body: block?.body ?? '' };
  });

  const generate = useGenerateLetter(item, previewBlocks);

  const handleCreate = async () => {
    if (!name.trim()) return;
    const created = await createItem({ name: name.trim() });
    if (created) navigate(`/career/${created.id}`, { replace: true });
  };

  const handleSaveSelection = async () => {
    await saveItemBlocks(selection.map((s, index) => ({ blockId: s.blockId, position: index, length: s.length })));
    setBlocksDialogOpen(false);
  };

  const handleSwapBlock = async (index: number, newBlockId: string) => {
    const next = selection.map((s, i) => (i === index ? { ...s, blockId: newBlockId } : s));
    setSelection(next);
    try {
      await saveItemBlocks(next.map((s, i) => ({ blockId: s.blockId, position: i, length: s.length })));
      toast.success('Block swapped');
    } catch {
      // useItemBlocks already surfaces the failure toast.
    }
  };

  const handleSaveName = async () => {
    if (!item || !name.trim() || name === item.name) return;
    await updateItem(item.id, { name: name.trim() });
  };

  const handleUploadCv = async (file: File) => {
    if (!item || !user) return;
    setIsUploadingCv(true);
    try {
      const storage = new CareerStorageService();
      const bytes = new Uint8Array(await file.arrayBuffer());
      const path = buildStoragePath(user.id, item.shareToken, 'cv.pdf');
      await storage.upload(path, bytes, 'application/pdf');
      await updateItem(item.id, { cvFilePath: path });
    } catch (err) {
      Logger.error('Error uploading CV', err);
      toast.error('Failed to upload CV');
    } finally {
      setIsUploadingCv(false);
    }
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
    const url = await generate.cvShareUrl();
    if (url) {
      await navigator.clipboard.writeText(url);
      toast.success('CV link copied');
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
            placeholder="e.g. Android Developer"
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
        <div className="flex items-center gap-2 flex-shrink-0">
          {item.shareToken && (
            <Button size="sm" variant="ghost" onClick={() => setRevokeOpen(true)}>
              <ShieldOff className="h-4 w-4 mr-1.5" />
              Revoke CV link
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setBlocksDialogOpen(true)}>
            <ListChecks className="h-4 w-4 mr-1.5" />
            Edit blocks
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 max-w-5xl mx-auto grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <CvUploadPanel
              hasCv={!!item.cvFilePath}
              onUpload={handleUploadCv}
              onRemove={handleRemoveCv}
              onCopyLink={handleCopyCvLink}
              isSaving={isUploadingCv}
            />

            <div className="rounded-lg border border-border p-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="jobTitle">Job title</Label>
                  <Input
                    id="jobTitle"
                    value={generate.jobTitle}
                    onChange={(e) => generate.setJobTitle(e.target.value)}
                    placeholder="Senior Software Engineer"
                    className={cn(generate.missing.includes('job_title') && 'border-destructive focus-visible:ring-destructive')}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    value={generate.company}
                    onChange={(e) => generate.setCompany(e.target.value)}
                    placeholder="Acme Corp"
                    className={cn(generate.missing.includes('company') && 'border-destructive focus-visible:ring-destructive')}
                  />
                </div>
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

            <BlockSwapList allBlocks={allBlocks} selected={selection} onSwap={handleSwapBlock} disabled={isSaving} />
          </div>

          <div className="lg:sticky lg:top-4 lg:self-start">
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
            <div className="flex justify-end gap-1 mt-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Copy cover letter" onClick={handleCopyText} disabled={!generate.canGenerate}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" title="Print / Save PDF" onClick={handlePrint} disabled={!generate.canGenerate}>
                <Printer className="h-4 w-4" />
              </Button>
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

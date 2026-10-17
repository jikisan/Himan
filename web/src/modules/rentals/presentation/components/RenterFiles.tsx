import { useEffect, useState } from 'react';
import { Eye, FileText, ImageOff, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { validateRentalFile } from '@himan/shared/rentals';
import type { Renter, RenterFile } from '@himan/shared/rentals';
import type { RentalsState } from '../pages/RentalsPage';
import { errorMessage } from '../utils/errorMessage';
import { cn } from '@core/presentation/utils';

const size = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

/** Valid ID files as preview cards: a thumbnail for photos, a PDF tile for PDFs. Private: loaded through short-lived links. */
export function RenterFiles({ renter, busy, run, fileUrl }: { renter: Renter } & Pick<RentalsState, 'busy' | 'run' | 'fileUrl'>) {
  const [uploading, setUploading] = useState(false);
  const open = async (file: RenterFile) => {
    const tab = window.open('about:blank', '_blank');
    if (!tab) { toast.error('Allow pop-ups to open this file'); return; }
    tab.opener = null;
    try { tab.location.replace(await fileUrl(file.id)); } catch (e) { tab.close(); toast.error(errorMessage(e)); }
  };
  const upload = async (files: File[]) => {
    setUploading(true);
    try {
      for (const file of files) validateRentalFile(file.name, file.type, file.size);
      for (const file of files) await run({ type: 'uploadRenterFile', renterId: renter.id, propertyId: renter.propertyId,
        file: { name: file.name, mimeType: file.type, bytes: await file.arrayBuffer() } });
      if (files.length) toast.success(files.length === 1 ? 'ID attached' : `${files.length} files attached`);
    } catch (e) { toast.error(errorMessage(e)); } finally { setUploading(false); }
  };

  return <section aria-labelledby="renter-files" className="space-y-3">
    <div>
      <h3 id="renter-files" className="text-sm font-semibold">Valid ID</h3>
      <p className="text-xs text-muted-foreground">Private. Only you and managers can open these.</p>
    </div>
    <ul className="grid grid-cols-2 gap-3">
      {renter.files.map((file) => <IdCard key={file.id} file={file} busy={busy} fileUrl={fileUrl} onOpen={() => void open(file)}
        onRemove={() => run({ type: 'removeRenterFile', id: file.id }).then(() => toast.success('ID removed'), (e) => toast.error(errorMessage(e)))} />)}
      <li>
        <label className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed px-3 text-center text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
          <Upload aria-hidden className="h-5 w-5" />
          <span className="font-medium text-foreground">{uploading ? 'Uploading…' : renter.files.length ? 'Add another' : 'Attach ID'}</span>
          <span className="text-xs">Photo or PDF, up to 10 MB</span>
          <input type="file" className="sr-only" multiple accept="application/pdf,image/jpeg,image/png" disabled={uploading || busy}
            aria-label="Attach ID" onChange={(event) => { void upload([...(event.target.files ?? [])]); event.target.value = ''; }} />
        </label>
      </li>
    </ul>
  </section>;
}

function IdCard({ file, busy, fileUrl, onOpen, onRemove }: {
  file: RenterFile; busy: boolean; fileUrl: RentalsState['fileUrl']; onOpen(): void; onRemove(): Promise<unknown>;
}) {
  const isImage = file.mimeType.startsWith('image/');
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  // Photos load a thumbnail through a short-lived signed link, once per file; PDFs show a tile instead.
  useEffect(() => {
    if (!isImage || !file.ready) return;
    let live = true;
    fileUrl(file.id).then((url) => { if (live) setSrc(url); }, () => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [file.id, file.ready, isImage, fileUrl]);

  return <li className="overflow-hidden rounded-lg border bg-card">
    <button type="button" onClick={onOpen} disabled={!file.ready} aria-label={`View ${file.name}`}
      className="group relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:cursor-not-allowed">
      {isImage && src && !failed
        ? <img src={src} alt="" className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105" onError={() => setFailed(true)} />
        : isImage && !failed && file.ready ? <span aria-hidden className="h-full w-full animate-pulse bg-muted" />
        : <span className="flex flex-col items-center gap-1 text-muted-foreground">
          {isImage ? <ImageOff aria-hidden className="h-6 w-6" /> : <FileText aria-hidden className="h-8 w-8" />}
          <span className="text-xs font-semibold uppercase">{isImage ? 'No preview' : 'PDF'}</span>
        </span>}
      {file.ready && <span aria-hidden className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        <span className="flex items-center gap-1 rounded-full bg-background/90 px-2.5 py-1 text-xs font-semibold text-foreground"><Eye className="h-3.5 w-3.5" />View</span>
      </span>}
    </button>
    <div className="space-y-2 p-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium" title={file.name}>{file.name}</p>
        <p className={cn('text-xs', file.ready ? 'text-muted-foreground' : 'text-destructive')}>{file.ready ? size(file.size) : 'Upload didn’t finish. Remove and attach again.'}</p>
      </div>
      {confirming
        ? <div className="flex gap-1">
          <Button variant="destructive" size="sm" className="h-9 flex-1 px-2 sm:h-8" disabled={busy}
            onClick={() => void onRemove().finally(() => setConfirming(false))}>Remove</Button>
          <Button variant="outline" size="sm" className="h-9 flex-1 px-2 sm:h-8" onClick={() => setConfirming(false)}>Keep</Button>
        </div>
        : <div className="flex gap-1">
          <Button variant="outline" size="sm" className="h-9 flex-1 px-2 sm:h-8" disabled={!file.ready} onClick={onOpen}
            aria-label={`Open ${file.name}`}><Eye className="h-4 w-4" />View</Button>
          <Button variant="ghost" size="icon" className="size-9 shrink-0 text-destructive hover:text-destructive sm:size-8" disabled={busy}
            aria-label={`Remove ${file.name}`} onClick={() => setConfirming(true)}><Trash2 className="h-4 w-4" /></Button>
        </div>}
    </div>
  </li>;
}

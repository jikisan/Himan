import { useState } from 'react';
import { Eye, FileText, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { validateRentalFile } from '@himan/shared/rentals';
import type { Renter, RenterFile } from '@himan/shared/rentals';
import type { RentalsState } from '../pages/RentalsPage';
import { errorMessage } from '../utils/errorMessage';

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
      if (files.length) toast.success('ID attached');
    } catch (e) { toast.error(errorMessage(e)); } finally { setUploading(false); }
  };
  return <section className="space-y-3 rounded-lg border bg-muted/30 p-4">
    <div><h3 className="text-sm font-semibold">Valid ID</h3>
      <p className="text-xs text-muted-foreground">Private. Only you and managers can open these.</p></div>
    {renter.files.map((file) => <div key={file.id} className="flex items-center gap-3 rounded-lg border p-2 pl-3">
      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate text-sm">{file.name}{!file.ready && <span className="text-muted-foreground"> · incomplete</span>}</span>
      <div className="flex gap-1">
        {file.ready && <Button variant="ghost" size="icon" className="size-11 sm:size-9" aria-label={`View ${file.name}`} onClick={() => void open(file)}><Eye className="h-4 w-4" /></Button>}
        <Button variant="ghost" size="icon" className="size-11 sm:size-9" aria-label={`Remove ${file.name}`} disabled={busy}
          onClick={() => void run({ type: 'removeRenterFile', id: file.id }).catch((e) => toast.error(errorMessage(e)))}><Trash2 className="h-4 w-4" /></Button>
      </div>
    </div>)}
    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-4 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
      <Upload className="h-4 w-4" />{uploading ? 'Uploading…' : <span><span className="font-medium text-foreground">Attach ID</span> · PDF, JPEG or PNG up to 10 MB</span>}
      <input type="file" className="sr-only" multiple accept="application/pdf,image/jpeg,image/png" disabled={uploading || busy}
        onChange={(event) => { void upload([...(event.target.files ?? [])]); event.target.value = ''; }} />
    </label>
  </section>;
}

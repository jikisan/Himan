import { useState } from 'react';
import { Eye, Trash2, Upload } from 'lucide-react';
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
  return <section className="space-y-3 border-t pt-4">
    <h3 className="font-medium">Valid ID</h3>
    {renter.files.map((file) => <div key={file.id} className="flex items-center justify-between rounded-lg border p-3">
      <span className="truncate text-sm">{file.name}{!file.ready && ' (incomplete)'}</span>
      <div className="flex gap-1">
        {file.ready && <Button variant="ghost" size="icon" aria-label={`View ${file.name}`} onClick={() => void open(file)}><Eye className="h-4 w-4" /></Button>}
        <Button variant="ghost" size="icon" aria-label={`Remove ${file.name}`} disabled={busy}
          onClick={() => void run({ type: 'removeRenterFile', id: file.id }).catch((e) => toast.error(errorMessage(e)))}><Trash2 className="h-4 w-4" /></Button>
      </div>
    </div>)}
    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 text-sm">
      <Upload className="h-4 w-4" />{uploading ? 'Uploading…' : 'Attach ID (PDF, JPEG, PNG · 10 MB)'}
      <input type="file" className="sr-only" multiple accept="application/pdf,image/jpeg,image/png" disabled={uploading || busy}
        onChange={(event) => { void upload([...(event.target.files ?? [])]); event.target.value = ''; }} />
    </label>
  </section>;
}

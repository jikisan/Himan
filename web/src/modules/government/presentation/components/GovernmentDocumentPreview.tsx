import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Loader2 } from 'lucide-react';
import type { GovernmentDocument } from '@himan/shared/government';

export function GovernmentDocumentPreview({ document, userId, documentUrl, onOpen, openLabel }: {
  document: GovernmentDocument; userId: string;
  documentUrl: (id: string) => Promise<string>; onOpen: () => void; openLabel?: string;
}) {
  const [failed, setFailed] = useState(false);
  const preview = useQuery({
    queryKey: ['government-preview', userId, document.id], queryFn: () => documentUrl(document.id),
    enabled: document.ready, meta: { sensitive: true }, gcTime: 0, staleTime: 45000,
    refetchInterval: 45000, retry: false,
  });
  return <div className="relative flex aspect-[16/10] w-full items-center justify-center overflow-hidden rounded-xl border bg-background">
    {preview.isLoading ? <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin text-muted-foreground" />
      : preview.data && !failed ? document.mimeType === 'application/pdf'
        ? <object data={`${preview.data}#page=1&toolbar=0&navpanes=0`} type="application/pdf" title={`PDF preview: ${document.name}`} tabIndex={-1}
            className="pointer-events-none h-full w-full bg-white text-slate-700">
            <span className="flex h-full flex-col items-center justify-center gap-2 p-4 text-sm"><FileText aria-hidden="true" className="h-7 w-7" />PDF document · Open to view</span>
          </object>
        : <img src={preview.data} alt={document.name} loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-contain" onError={() => setFailed(true)} />
      : <span className="flex flex-col items-center gap-2 p-4 text-sm text-muted-foreground"><FileText aria-hidden="true" className="h-7 w-7" />Preview unavailable · Open document</span>}
    <button type="button" aria-label={`Preview ${document.name}`} onClick={onOpen}
      className="absolute inset-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
      <span className="absolute bottom-2 right-2 rounded-md border bg-card px-2 py-1 text-xs text-foreground">{openLabel ?? `Open ${document.mimeType === 'application/pdf' ? 'PDF' : 'image'}`}</span>
    </button>
  </div>;
}

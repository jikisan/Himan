import { useState } from 'react';
import { FileDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { ButtonProps } from '@/components/ui/button';

/** A button that makes a PDF: disabled with a spinner while it works, a plain message if it fails. */
export function PdfButton({ make, children, ...props }: { make(): Promise<void> } & Omit<ButtonProps, 'onClick'>) {
  const [working, setWorking] = useState(false);
  return <Button variant="outline" {...props} disabled={working || props.disabled} onClick={async () => {
    setWorking(true);
    try { await make(); } catch { toast.error('Couldn’t make the PDF. Check your connection and try again.'); } finally { setWorking(false); }
  }}>{working ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}{children}</Button>;
}

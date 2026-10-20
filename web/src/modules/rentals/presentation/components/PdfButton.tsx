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
    try { await make(); } catch (error) {
      toast.error(isNetworkError(error) ? 'Couldn’t make the PDF. Check your connection and try again.' : 'Couldn’t make the PDF. Try again.');
    } finally { setWorking(false); }
  }}>{working ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}{children}</Button>;
}

// A failed dynamic import or fetch is a TypeError worded per browser ("Failed to fetch", "Importing a module script
// failed", "NetworkError…", "Load failed"); other TypeErrors are bugs, not the connection.
const isNetworkError = (error: unknown) => error instanceof TypeError && /fetch|import|network|load/i.test(error.message);

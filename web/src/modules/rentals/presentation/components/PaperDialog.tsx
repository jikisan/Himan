import { useState } from 'react';
import type { ReactNode } from 'react';
import { FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ButtonProps } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PdfButton } from './PdfButton';

/** A button that opens a paper copy (contract, receipt) in a scrollable dialog, with the same PDF to download. `children` runs only while open. */
export function PaperDialog({ label, title, description, make, children, ...trigger }: {
  label: string; title: string; description: string; make(): Promise<void>; children(): ReactNode;
} & Omit<ButtonProps, 'onClick' | 'children'>) {
  const [open, setOpen] = useState(false);
  return <>
    <Button variant="outline" {...trigger} onClick={() => setOpen(true)}><FileText className="h-4 w-4" />{label}</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="flex max-h-[92dvh] max-w-2xl flex-col gap-3 p-3 sm:p-5">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto rounded-md bg-muted/40 p-2 [scrollbar-width:thin] sm:p-3">{children()}</div>
        <div className="flex justify-end"><PdfButton className="h-11 sm:h-9" make={make}>Download PDF</PdfButton></div>
      </DialogContent>
    </Dialog>
  </>;
}

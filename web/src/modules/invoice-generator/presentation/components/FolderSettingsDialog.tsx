import { useState, useEffect, type FormEvent } from 'react';
import { useFieldErrors } from '@core/presentation/hooks';
import { FieldError, FormErrorBanner } from '@core/presentation/components';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  Label,
} from '@/components/ui';
import { InvoiceNumberService } from '../../infrastructure/services';
import type { InvoiceFolder } from '../../domain/entities/InvoiceFolder';

interface FolderSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folder: InvoiceFolder | null;
  onSave: (dto: {
    invoiceNumberPrefix?: string | null;
    invoiceNumberFormat?: string;
    nextSequenceNumber?: number;
  }) => Promise<void>;
}

export const FolderSettingsDialog = ({
  open,
  onOpenChange,
  folder,
  onSave,
}: FolderSettingsDialogProps) => {
  const [prefix, setPrefix] = useState('');
  const [format, setFormat] = useState('INV-{YYYY}-{NNN}');
  const [sequence, setSequence] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const fe = useFieldErrors();
  const clearErrors = fe.clear;

  useEffect(() => {
    if (folder && open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset form when dialog opens for a different folder
      setPrefix(folder.invoiceNumberPrefix ?? '');
      setFormat(folder.invoiceNumberFormat);
      setSequence(folder.nextSequenceNumber);
      clearErrors();
    }
  }, [folder, open, clearErrors]);

  const preview = InvoiceNumberService.generate(format, sequence, prefix || null);

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    fe.clear();
    if (!format.trim()) { fe.fail('format', 'Enter a format pattern'); return; }
    setIsSaving(true);
    try {
      await onSave({
        invoiceNumberPrefix: prefix || null,
        invoiceNumberFormat: format,
        nextSequenceNumber: sequence,
      });
      onOpenChange(false);
    } catch {
      fe.setFormError('Failed to save folder settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetSequence = () => {
    setSequence(1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Folder Settings: {folder?.name}</DialogTitle>
          <DialogDescription>
            Configure the auto-numbering format for invoices in this folder.
          </DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={handleSave} className="space-y-4">
          <FormErrorBanner message={fe.formError} />
          <div className="space-y-2">
            <Label htmlFor="prefix">Prefix (optional)</Label>
            <Input
              id="prefix"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="e.g. ACME"
              maxLength={20}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="format" required>Format Pattern</Label>
            <Input
              id="format"
              required
              {...fe.invalid('format')}
              value={format}
              onChange={(e) => { setFormat(e.target.value); fe.clear('format'); }}
              placeholder="INV-{YYYY}-{NNN}"
              maxLength={50}
            />
            <FieldError id="format" message={fe.errors.format} />
            <p className="text-xs text-muted-foreground">
              Tokens: {'{YYYY}'} year, {'{YY}'} short year, {'{MM}'} month, {'{PREFIX}'} prefix, {'{NNN}'} sequence (N count = padding width)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sequence">Next Sequence Number</Label>
            <div className="flex gap-2">
              <Input
                id="sequence"
                type="number"
                value={sequence}
                onChange={(e) => setSequence(Math.max(1, parseInt(e.target.value) || 1))}
                min={1}
                className="w-24"
              />
              <Button type="button" variant="outline" size="sm" onClick={handleResetSequence}>
                Reset to 1
              </Button>
            </div>
          </div>

          <div className="bg-muted/50 rounded-md p-3">
            <p className="text-xs text-muted-foreground mb-1">Preview of next invoice number:</p>
            <p className="font-mono font-medium">{preview}</p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

import { Label, Textarea } from '@/components/ui';
import type { InvoiceData } from '@invoice-generator/domain/types';

interface InvoiceFooterProps {
  data: InvoiceData;
  onChange: (updates: Partial<InvoiceData>) => void;
}

export const InvoiceFooter = ({ data, onChange }: InvoiceFooterProps) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="notes">Notes / Payment Terms</Label>
          <Textarea
            id="notes"
            value={data.notes || ''}
            onChange={(e) => onChange({ notes: e.target.value })}
            placeholder="Payment is due within 15 days"
            className="min-h-[80px]"
            maxLength={1000}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bankDetails">Bank Details (Optional)</Label>
          <Textarea
            id="bankDetails"
            value={data.bankDetails || ''}
            onChange={(e) => onChange({ bankDetails: e.target.value })}
            placeholder="Bank Name&#10;Account Name&#10;Account Number"
            className="min-h-[80px]"
            maxLength={500}
          />
        </div>
      </div>
    </div>
  );
};

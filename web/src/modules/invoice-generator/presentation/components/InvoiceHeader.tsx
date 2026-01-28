import { Input, Label, Textarea } from '@/components/ui';
import { LogoUploader } from './LogoUploader';
import { CurrencySelect } from './CurrencySelect';
import type { InvoiceData, CurrencyCode } from '@invoice-generator/domain/types';

interface InvoiceHeaderProps {
  data: InvoiceData;
  onChange: (updates: Partial<InvoiceData>) => void;
}

export const InvoiceHeader = ({ data, onChange }: InvoiceHeaderProps) => {
  return (
    <div className="space-y-6">
      {/* Invoice Number and PO Number */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="invoiceNumber">Invoice Number *</Label>
          <Input
            id="invoiceNumber"
            value={data.invoiceNumber}
            onChange={(e) => onChange({ invoiceNumber: e.target.value })}
            placeholder="INV-001"
            maxLength={50}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="poNumber">Purchase Order (Optional)</Label>
          <Input
            id="poNumber"
            value={data.poNumber || ''}
            onChange={(e) => onChange({ poNumber: e.target.value })}
            placeholder="PO-001"
            maxLength={50}
          />
        </div>
      </div>

      {/* Logo and Currency */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Company Logo (Optional)</Label>
          <LogoUploader
            logo={data.logo}
            onLogoChange={(logo) => onChange({ logo })}
          />
        </div>
        <div className="space-y-2">
          <Label>Currency</Label>
          <CurrencySelect
            value={data.currency}
            onChange={(currency: CurrencyCode) => onChange({ currency })}
          />
        </div>
      </div>

      {/* Company Details and Bill To */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="companyDetails">Your Company Details</Label>
          <Textarea
            id="companyDetails"
            value={data.companyDetails}
            onChange={(e) => onChange({ companyDetails: e.target.value })}
            placeholder="Company Name&#10;Address&#10;Phone / Email"
            className="min-h-[100px]"
            maxLength={500}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="billTo">Bill To</Label>
          <Textarea
            id="billTo"
            value={data.billTo}
            onChange={(e) => onChange({ billTo: e.target.value })}
            placeholder="Client Name&#10;Address&#10;Phone / Email"
            className="min-h-[100px]"
            maxLength={500}
          />
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="invoiceDate">Invoice Date</Label>
          <Input
            id="invoiceDate"
            type="date"
            value={data.invoiceDate}
            onChange={(e) => onChange({ invoiceDate: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dueDate">Due Date</Label>
          <Input
            id="dueDate"
            type="date"
            value={data.dueDate}
            onChange={(e) => onChange({ dueDate: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
};

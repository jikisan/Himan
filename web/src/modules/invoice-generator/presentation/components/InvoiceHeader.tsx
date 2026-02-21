import { Input, Label, Textarea } from '@/components/ui';
import { CurrencySelect } from './CurrencySelect';
import { SavedOptionSelect } from './SavedOptionSelect';
import { DatePicker } from '@/components/ui';
import type { InvoiceData, CurrencyCode, InvoiceSavedOptionType, SavedOptionType } from '@invoice-generator/domain/types';

interface InvoiceHeaderProps {
  data: InvoiceData;
  onChange: (updates: Partial<InvoiceData>) => void;
  savedCompanyOptions?: InvoiceSavedOptionType[];
  savedBillToOptions?: InvoiceSavedOptionType[];
  onSaveOption?: (type: SavedOptionType, label: string, value: string) => void;
  onManageSavedOptions?: (type: SavedOptionType) => void;
  autoInvoiceNumber?: string | null;
}

export const InvoiceHeader = ({
  data,
  onChange,
  savedCompanyOptions = [],
  savedBillToOptions = [],
  onSaveOption,
  onManageSavedOptions,
  autoInvoiceNumber,
}: InvoiceHeaderProps) => {
  const invoiceNumberValue = autoInvoiceNumber ?? data.invoiceNumber;

  return (
    <div className="space-y-6">
      {/* Invoice Number and PO Number */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="invoiceNumber">Invoice Number *</Label>
          <Input
            id="invoiceNumber"
            value={invoiceNumberValue}
            onChange={(e) => onChange({ invoiceNumber: e.target.value })}
            placeholder="INV-001"
            maxLength={50}
          />
          {autoInvoiceNumber && (
            <p className="text-xs text-muted-foreground">Auto-generated from folder settings</p>
          )}
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
          <div className="flex items-center gap-1">
            <Label htmlFor="companyDetails">Your Company Details</Label>
            {onSaveOption && onManageSavedOptions && (
              <SavedOptionSelect
                options={savedCompanyOptions}
                currentValue={data.companyDetails}
                onSelect={(value) => onChange({ companyDetails: value })}
                onSaveCurrent={(label) => onSaveOption('company_details', label, data.companyDetails)}
                onManage={() => onManageSavedOptions('company_details')}
              />
            )}
          </div>
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
          <div className="flex items-center gap-1">
            <Label htmlFor="billTo">Bill To</Label>
            {onSaveOption && onManageSavedOptions && (
              <SavedOptionSelect
                options={savedBillToOptions}
                currentValue={data.billTo}
                onSelect={(value) => onChange({ billTo: value })}
                onSaveCurrent={(label) => onSaveOption('bill_to', label, data.billTo)}
                onManage={() => onManageSavedOptions('bill_to')}
              />
            )}
          </div>
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
          <Label>Invoice Date</Label>
          <DatePicker
            value={data.invoiceDate}
            onChange={(invoiceDate) => onChange({ invoiceDate })}
          />
        </div>
        <div className="space-y-2">
          <Label>Due Date</Label>
          <DatePicker
            value={data.dueDate}
            onChange={(dueDate) => onChange({ dueDate })}
          />
        </div>
      </div>
    </div>
  );
};

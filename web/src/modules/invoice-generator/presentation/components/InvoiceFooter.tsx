import { Label, Textarea } from '@/components/ui';
import { SavedOptionSelect } from './SavedOptionSelect';
import type { InvoiceData, InvoiceSavedOptionType, SavedOptionType } from '@invoice-generator/domain/types';

interface InvoiceFooterProps {
  data: InvoiceData;
  onChange: (updates: Partial<InvoiceData>) => void;
  savedNotesOptions?: InvoiceSavedOptionType[];
  savedBankOptions?: InvoiceSavedOptionType[];
  onSaveOption?: (type: SavedOptionType, label: string, value: string) => void;
  onManageSavedOptions?: (type: SavedOptionType) => void;
}

export const InvoiceFooter = ({
  data,
  onChange,
  savedNotesOptions = [],
  savedBankOptions = [],
  onSaveOption,
  onManageSavedOptions,
}: InvoiceFooterProps) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-1">
            <Label htmlFor="notes">Notes / Payment Terms</Label>
            {onSaveOption && onManageSavedOptions && (
              <SavedOptionSelect
                options={savedNotesOptions}
                currentValue={data.notes || ''}
                onSelect={(value) => onChange({ notes: value })}
                onSaveCurrent={(label) => onSaveOption('notes', label, data.notes || '')}
                onManage={() => onManageSavedOptions('notes')}
              />
            )}
          </div>
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
          <div className="flex items-center gap-1">
            <Label htmlFor="bankDetails">Bank Details (Optional)</Label>
            {onSaveOption && onManageSavedOptions && (
              <SavedOptionSelect
                options={savedBankOptions}
                currentValue={data.bankDetails || ''}
                onSelect={(value) => onChange({ bankDetails: value })}
                onSaveCurrent={(label) => onSaveOption('bank_details', label, data.bankDetails || '')}
                onManage={() => onManageSavedOptions('bank_details')}
              />
            )}
          </div>
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

import { Input, Label } from '@/components/ui';
import type { InvoiceData } from '@invoice-generator/domain/types';
import { isValidLineItem } from '@invoice-generator/domain/types';
import { formatCurrency } from '../utils/currency';

interface InvoiceSummaryProps {
  data: InvoiceData;
  onChange: (updates: Partial<InvoiceData>) => void;
}

export const InvoiceSummary = ({ data, onChange }: InvoiceSummaryProps) => {
  const validItems = data.lineItems.filter(isValidLineItem);

  const subtotal = validItems.reduce(
    (sum, item) => sum + item.unitCost * item.quantity,
    0
  );

  const taxAmount = subtotal * (data.taxRate / 100);
  const total = subtotal + taxAmount - data.discount + data.shippingFee;

  return (
    <div className="space-y-4 max-w-sm ml-auto">
      {/* Subtotal */}
      <div className="flex justify-between items-center py-2 border-b border-border">
        <span className="text-muted-foreground">Subtotal</span>
        <span className="font-mono">{formatCurrency(subtotal, data.currency)}</span>
      </div>

      {/* Tax Rate */}
      <div className="flex justify-between items-center gap-4">
        <Label htmlFor="taxRate" className="text-muted-foreground whitespace-nowrap">
          Tax Rate (%)
        </Label>
        <Input
          id="taxRate"
          type="number"
          value={data.taxRate || ''}
          onChange={(e) => onChange({ taxRate: parseFloat(e.target.value) || 0 })}
          min={0}
          max={100}
          step="0.01"
          className="w-24 text-right"
        />
      </div>

      {/* Tax Amount */}
      <div className="flex justify-between items-center py-2 border-b border-border">
        <span className="text-muted-foreground">Tax Amount</span>
        <span className="font-mono">{formatCurrency(taxAmount, data.currency)}</span>
      </div>

      {/* Discount */}
      <div className="flex justify-between items-center gap-4">
        <Label htmlFor="discount" className="text-muted-foreground whitespace-nowrap">
          Discount
        </Label>
        <Input
          id="discount"
          type="number"
          value={data.discount || ''}
          onChange={(e) => onChange({ discount: parseFloat(e.target.value) || 0 })}
          min={0}
          step="0.01"
          className="w-24 text-right"
        />
      </div>

      {/* Shipping Fee */}
      <div className="flex justify-between items-center gap-4">
        <Label htmlFor="shippingFee" className="text-muted-foreground whitespace-nowrap">
          Shipping Fee
        </Label>
        <Input
          id="shippingFee"
          type="number"
          value={data.shippingFee || ''}
          onChange={(e) => onChange({ shippingFee: parseFloat(e.target.value) || 0 })}
          min={0}
          step="0.01"
          className="w-24 text-right"
        />
      </div>

      {/* Total */}
      <div className="flex justify-between items-center py-3 border-t-2 border-primary">
        <span className="text-lg font-semibold">Total</span>
        <span className="text-lg font-bold font-mono">
          {formatCurrency(total, data.currency)}
        </span>
      </div>
    </div>
  );
};

// Export calculation helpers for use in preview
export const calculateInvoiceTotals = (data: InvoiceData) => {
  const validItems = data.lineItems.filter(isValidLineItem);
  const subtotal = validItems.reduce(
    (sum, item) => sum + item.unitCost * item.quantity,
    0
  );
  const taxAmount = subtotal * (data.taxRate / 100);
  const total = subtotal + taxAmount - data.discount + data.shippingFee;

  return { subtotal, taxAmount, total, validItems };
};

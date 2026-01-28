import { forwardRef } from 'react';
import type { InvoiceData } from '@invoice-generator/domain/types';
import { formatCurrency } from '../utils/currency';
import { calculateInvoiceTotals } from './InvoiceSummary';

interface InvoicePreviewProps {
  data: InvoiceData;
}

export const InvoicePreview = forwardRef<HTMLDivElement, InvoicePreviewProps>(
  ({ data }, ref) => {
    const { subtotal, taxAmount, total, validItems } = calculateInvoiceTotals(data);

    const formatDate = (dateString: string) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    return (
      <div
        ref={ref}
        style={{
          position: 'absolute',
          left: '-9999px',
          top: 0,
          width: '210mm',
          backgroundColor: '#ffffff',
          color: '#000000',
          fontFamily: 'Arial, sans-serif',
          fontSize: '12px',
          lineHeight: '1.5',
          padding: '20mm',
          boxSizing: 'border-box',
        }}
      >
        {/* Header with Logo and Invoice Info */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
          <div>
            {data.logo && (
              <img
                src={data.logo}
                alt="Company Logo"
                style={{ maxHeight: '60px', maxWidth: '150px', objectFit: 'contain', marginBottom: '10px' }}
              />
            )}
            <div style={{ whiteSpace: 'pre-line', fontSize: '11px', color: '#333' }}>
              {data.companyDetails}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 10px 0', color: '#000' }}>
              INVOICE
            </h1>
            <div style={{ fontSize: '12px' }}>
              <div><strong>Invoice #:</strong> {data.invoiceNumber || 'Draft'}</div>
              {data.poNumber && <div><strong>PO #:</strong> {data.poNumber}</div>}
              <div><strong>Date:</strong> {formatDate(data.invoiceDate)}</div>
              <div><strong>Due Date:</strong> {formatDate(data.dueDate)}</div>
            </div>
          </div>
        </div>

        {/* Bill To */}
        <div style={{ marginBottom: '30px' }}>
          <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#666', marginBottom: '5px' }}>
            BILL TO
          </div>
          <div style={{ whiteSpace: 'pre-line', fontSize: '12px' }}>
            {data.billTo}
          </div>
        </div>

        {/* Line Items Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5' }}>
              <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd', fontSize: '11px', fontWeight: 'bold' }}>
                Description
              </th>
              <th style={{ padding: '10px', textAlign: 'right', borderBottom: '2px solid #ddd', fontSize: '11px', fontWeight: 'bold', width: '80px' }}>
                Unit Cost
              </th>
              <th style={{ padding: '10px', textAlign: 'right', borderBottom: '2px solid #ddd', fontSize: '11px', fontWeight: 'bold', width: '60px' }}>
                Qty
              </th>
              <th style={{ padding: '10px', textAlign: 'right', borderBottom: '2px solid #ddd', fontSize: '11px', fontWeight: 'bold', width: '100px' }}>
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {validItems.map((item, index) => (
              <tr key={item.id} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#fafafa' }}>
                <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                  {item.description}
                </td>
                <td style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #eee' }}>
                  {formatCurrency(item.unitCost, data.currency)}
                </td>
                <td style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #eee' }}>
                  {item.quantity}
                </td>
                <td style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #eee' }}>
                  {formatCurrency(item.unitCost * item.quantity, data.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Summary */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '30px' }}>
          <div style={{ width: '250px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal, data.currency)}</span>
            </div>
            {data.taxRate > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
                  <span>Tax ({data.taxRate}%)</span>
                  <span>{formatCurrency(taxAmount, data.currency)}</span>
                </div>
              </>
            )}
            {data.discount > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
                <span>Discount</span>
                <span>-{formatCurrency(data.discount, data.currency)}</span>
              </div>
            )}
            {data.shippingFee > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
                <span>Shipping</span>
                <span>{formatCurrency(data.shippingFee, data.currency)}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontWeight: 'bold', fontSize: '14px', borderTop: '2px solid #333' }}>
              <span>Total</span>
              <span>{formatCurrency(total, data.currency)}</span>
            </div>
          </div>
        </div>

        {/* Footer - Notes and Bank Details */}
        <div style={{ display: 'flex', gap: '40px', marginTop: '20px' }}>
          {data.notes && (
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#666', marginBottom: '5px' }}>
                NOTES
              </div>
              <div style={{ whiteSpace: 'pre-line', fontSize: '11px', color: '#333' }}>
                {data.notes}
              </div>
            </div>
          )}
          {data.bankDetails && (
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#666', marginBottom: '5px' }}>
                BANK DETAILS
              </div>
              <div style={{ whiteSpace: 'pre-line', fontSize: '11px', color: '#333' }}>
                {data.bankDetails}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);

InvoicePreview.displayName = 'InvoicePreview';

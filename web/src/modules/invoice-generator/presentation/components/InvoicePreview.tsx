import { forwardRef } from 'react';
import type { InvoiceData } from '@invoice-generator/domain/types';
import { calculateInvoiceTotals } from './InvoiceSummary';

interface InvoicePreviewProps {
  data: InvoiceData;
}

const ACCENT = '#546e7a';

const formatNumber = (amount: number): string => {
  const hasDecimals = amount % 1 !== 0;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatWithCurrency = (amount: number, currency: string): string =>
  `${formatNumber(amount)} ${currency}`;

export const InvoicePreview = forwardRef<HTMLDivElement, InvoicePreviewProps>(
  ({ data }, ref) => {
    const { subtotal, taxAmount, total } = calculateInvoiceTotals(data);

    const displayItems = data.lineItems.filter(
      (item) => item.description.trim() !== ''
    );

    const formatDate = (dateString: string) => {
      if (!dateString) return '';
      const date = new Date(dateString + 'T00:00:00');
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };

    const labelStyle: React.CSSProperties = {
      fontSize: '9px',
      fontWeight: 700,
      color: '#888',
      textTransform: 'uppercase',
      letterSpacing: '0.5px',
      marginBottom: '4px',
    };

    const valueStyle: React.CSSProperties = {
      fontSize: '13px',
      color: '#333',
      whiteSpace: 'pre-line',
    };

    const summaryLabelStyle: React.CSSProperties = {
      fontSize: '12px',
      fontWeight: 600,
      color: ACCENT,
    };

    const summaryValueStyle: React.CSSProperties = {
      fontSize: '12px',
      color: '#333',
      textAlign: 'right',
    };

    const summaryRowStyle: React.CSSProperties = {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '4px 0',
    };

    return (
      <div
        ref={ref}
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          width: '210mm',
          backgroundColor: '#ffffff',
          color: '#000000',
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontSize: '12px',
          lineHeight: '1.5',
          padding: '20mm',
          boxSizing: 'border-box',
        }}
      >
        {/* Logo */}
        {data.logo && (
          <img
            src={data.logo}
            alt="Logo"
            style={{
              maxHeight: '50px',
              maxWidth: '150px',
              objectFit: 'contain',
              marginBottom: '12px',
            }}
          />
        )}

        {/* Title */}
        <h1
          style={{
            fontSize: '36px',
            fontWeight: 'bold',
            color: ACCENT,
            margin: '0 0 24px 0',
          }}
        >
          Invoice
        </h1>

        {/* Info Box */}
        <div
          style={{
            backgroundColor: '#f0f2f5',
            padding: '20px 24px',
            marginBottom: '40px',
            borderRadius: '4px',
          }}
        >
          {/* Row 1: Invoice Number, Date of Issue, Due Date */}
          <div style={{ display: 'flex', marginBottom: '18px' }}>
            <div style={{ flex: 1 }}>
              <div style={labelStyle}>Invoice Number</div>
              <div style={valueStyle}>{data.invoiceNumber || 'Draft'}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={labelStyle}>Date of Issue</div>
              <div style={valueStyle}>{formatDate(data.invoiceDate)}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={labelStyle}>Due Date</div>
              <div style={valueStyle}>{formatDate(data.dueDate)}</div>
            </div>
          </div>

          {/* Row 2: Billed To, From, Purchase Order */}
          <div style={{ display: 'flex' }}>
            <div style={{ flex: 1 }}>
              <div style={labelStyle}>Billed To</div>
              <div style={valueStyle}>{data.billTo || '-'}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={labelStyle}>From</div>
              <div style={valueStyle}>{data.companyDetails || '-'}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={labelStyle}>Purchase Order</div>
              <div style={valueStyle}>{data.poNumber || '-'}</div>
            </div>
          </div>
        </div>

        {/* Line Items Table */}
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            marginBottom: '8px',
          }}
        >
          <thead>
            <tr>
              <th
                style={{
                  textAlign: 'left',
                  padding: '12px 0',
                  color: ACCENT,
                  fontSize: '13px',
                  fontWeight: 600,
                  borderBottom: '2px solid #e0e0e0',
                }}
              >
                Description
              </th>
              <th
                style={{
                  textAlign: 'right',
                  padding: '12px 8px',
                  color: ACCENT,
                  fontSize: '13px',
                  fontWeight: 600,
                  borderBottom: '2px solid #e0e0e0',
                  width: '120px',
                }}
              >
                Unit cost
              </th>
              <th
                style={{
                  textAlign: 'right',
                  padding: '12px 8px',
                  color: ACCENT,
                  fontSize: '13px',
                  fontWeight: 600,
                  borderBottom: '2px solid #e0e0e0',
                  width: '60px',
                }}
              >
                QTY
              </th>
              <th
                style={{
                  textAlign: 'right',
                  padding: '12px 0',
                  color: ACCENT,
                  fontSize: '13px',
                  fontWeight: 600,
                  borderBottom: '2px solid #e0e0e0',
                  width: '120px',
                }}
              >
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {displayItems.map((item) => (
              <tr key={item.id}>
                <td
                  style={{
                    padding: '10px 0',
                    fontSize: '13px',
                    color: '#333',
                  }}
                >
                  {item.description}
                </td>
                <td
                  style={{
                    textAlign: 'right',
                    padding: '10px 8px',
                    fontSize: '13px',
                    color: '#333',
                  }}
                >
                  {formatNumber(item.unitCost)}
                </td>
                <td
                  style={{
                    textAlign: 'right',
                    padding: '10px 8px',
                    fontSize: '13px',
                    color: '#333',
                  }}
                >
                  {item.quantity}
                </td>
                <td
                  style={{
                    textAlign: 'right',
                    padding: '10px 0',
                    fontSize: '13px',
                    color: '#333',
                  }}
                >
                  {formatNumber(item.unitCost * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Teal Divider */}
        <div
          style={{
            borderBottom: `2px solid ${ACCENT}`,
            marginBottom: '24px',
          }}
        />

        {/* Terms + Summary */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '40px',
          }}
        >
          {/* Terms */}
          <div style={{ flex: 1, paddingRight: '40px' }}>
            {data.notes && (
              <>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: ACCENT,
                    marginBottom: '8px',
                  }}
                >
                  TERMS
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: '#333',
                    whiteSpace: 'pre-line',
                  }}
                >
                  {data.notes}
                </div>
              </>
            )}
          </div>

          {/* Summary */}
          <div style={{ width: '280px' }}>
            <div style={summaryRowStyle}>
              <span style={summaryLabelStyle}>SUBTOTAL</span>
              <span style={summaryValueStyle}>
                {formatWithCurrency(subtotal, data.currency)}
              </span>
            </div>
            <div style={summaryRowStyle}>
              <span style={summaryLabelStyle}>(TAX RATE)</span>
              <span style={summaryValueStyle}>{data.taxRate} %</span>
            </div>
            <div style={summaryRowStyle}>
              <span style={summaryLabelStyle}>TAX</span>
              <span style={summaryValueStyle}>
                {formatWithCurrency(taxAmount, data.currency)}
              </span>
            </div>
            {data.discount > 0 && (
              <div style={summaryRowStyle}>
                <span style={summaryLabelStyle}>DISCOUNT</span>
                <span style={summaryValueStyle}>
                  -{formatWithCurrency(data.discount, data.currency)}
                </span>
              </div>
            )}
            <div style={summaryRowStyle}>
              <span style={summaryLabelStyle}>SHIPPING</span>
              <span style={summaryValueStyle}>
                {formatWithCurrency(data.shippingFee, data.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Invoice Total */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            marginBottom: '40px',
          }}
        >
          <div
            style={{
              textAlign: 'right',
              padding: '16px 0',
              borderTop: '2px solid #e0e0e0',
              borderBottom: '2px solid #e0e0e0',
              minWidth: '280px',
            }}
          >
            <div
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: ACCENT,
                marginBottom: '4px',
              }}
            >
              INVOICE TOTAL
            </div>
            <div
              style={{
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#333',
              }}
            >
              {formatWithCurrency(total, data.currency)}
            </div>
          </div>
        </div>

        {/* Bank Account Details */}
        {data.bankDetails && (
          <div>
            <div
              style={{
                fontSize: '13px',
                fontWeight: 'bold',
                color: '#333',
                marginBottom: '8px',
              }}
            >
              BANK ACCOUNT DETAILS
            </div>
            <div
              style={{
                fontSize: '12px',
                color: '#333',
                whiteSpace: 'pre-line',
                lineHeight: '1.8',
              }}
            >
              {data.bankDetails}
            </div>
          </div>
        )}
      </div>
    );
  }
);

InvoicePreview.displayName = 'InvoicePreview';

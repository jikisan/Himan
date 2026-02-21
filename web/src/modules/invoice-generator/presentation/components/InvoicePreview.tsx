import { forwardRef } from "react";
import type { InvoiceData } from "@invoice-generator/domain/types";
import { calculateInvoiceTotals } from "./InvoiceSummary";

interface InvoicePreviewProps {
  data: InvoiceData;
}

const ACCENT = "#2c3e6b";
const ACCENT_LIGHT = "#eef1f8";
const TEXT_PRIMARY = "#1a1a2e";
const TEXT_SECONDARY = "#5a5a72";
const BORDER = "#e2e4ea";

const formatNumber = (amount: number): string => {
  const hasDecimals = amount % 1 !== 0;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatWithCurrency = (amount: number, currency: string): string =>
  `${formatNumber(amount)} ${currency}`;

export const InvoicePreview = forwardRef<HTMLDivElement, InvoicePreviewProps>(
  ({ data }, ref) => {
    const { subtotal, rushFeeAmount, taxAmount, total } = calculateInvoiceTotals(data);

    const displayItems = data.lineItems.filter(
      (item) => item.description.trim() !== "",
    );

    const formatDate = (dateString: string) => {
      if (!dateString) return "";
      const date = new Date(dateString + "T00:00:00");
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    };

    return (
      <div
        ref={ref}
        style={{
          width: "210mm",
          backgroundColor: "#ffffff",
          color: TEXT_PRIMARY,
          fontFamily: "'Segoe UI', Arial, Helvetica, sans-serif",
          fontSize: "12px",
          lineHeight: "1.6",
          boxSizing: "border-box",
        }}
      >
        {/* Accent top bar */}
        <div style={{ height: "6px", backgroundColor: ACCENT }} />

        <div style={{ padding: "10mm 24mm 20mm" }}>
          {/* Header: Logo + Title */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "36px",
            }}
          >
            {/* Left: Logo + Company */}
            <div>
              {data.logo && (
                <img
                  src={data.logo}
                  alt="Logo"
                  style={{
                    maxHeight: "54px",
                    maxWidth: "160px",
                    objectFit: "contain",
                    marginBottom: "10px",
                  }}
                />
              )}
              {data.companyDetails && (
                <div
                  style={{
                    fontSize: "12px",
                    color: TEXT_SECONDARY,
                    whiteSpace: "pre-line",
                    lineHeight: "1.7",
                    maxWidth: "240px",
                  }}
                >
                  {data.companyDetails}
                </div>
              )}
            </div>

            {/* Right: Invoice title + number */}
            <div style={{ textAlign: "right" }}>
              <h1
                style={{
                  fontSize: "40px",
                  fontWeight: 800,
                  color: ACCENT,
                  margin: "0",
                  letterSpacing: "-0.5px",
                  lineHeight: "1",
                }}
              >
                INVOICE
              </h1>
              <div
                style={{
                  fontSize: "14px",
                  color: TEXT_SECONDARY,
                  marginTop: "8px",
                  fontWeight: 500,
                }}
              >
                #{data.invoiceNumber || "Draft"}
              </div>
            </div>
          </div>

          {/* Info Grid: Billed To + Dates */}
          {(data.billTo || data.invoiceDate || data.dueDate || data.poNumber) && (
          <div
            style={{
              display: "flex",
              gap: "32px",
              marginBottom: "36px",
            }}
          >
            {/* Billed To */}
            {data.billTo && (
              <div
                style={{
                  flex: 1,
                  backgroundColor: ACCENT_LIGHT,
                  borderRadius: "6px",
                  padding: "18px 20px",
                  borderLeft: `4px solid ${ACCENT}`,
                }}
              >
                <div
                  style={{
                    fontSize: "9px",
                    fontWeight: 700,
                    color: ACCENT,
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    marginBottom: "8px",
                  }}
                >
                  Billed To
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    color: TEXT_PRIMARY,
                    whiteSpace: "pre-line",
                    lineHeight: "1.7",
                    fontWeight: 500,
                  }}
                >
                  {data.billTo}
                </div>
              </div>
            )}

            {/* Dates & PO */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "16px",
                minWidth: "280px",
              }}
            >
              {(data.invoiceDate || data.dueDate) && (
                <div style={{ display: "flex", gap: "24px" }}>
                  {data.invoiceDate && (
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: "9px",
                          fontWeight: 700,
                          color: TEXT_SECONDARY,
                          textTransform: "uppercase",
                          letterSpacing: "1px",
                          marginBottom: "4px",
                        }}
                      >
                        Date of Issue
                      </div>
                      <div
                        style={{
                          fontSize: "13px",
                          color: TEXT_PRIMARY,
                          fontWeight: 600,
                        }}
                      >
                        {formatDate(data.invoiceDate)}
                      </div>
                    </div>
                  )}
                  {data.dueDate && (
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontSize: "9px",
                          fontWeight: 700,
                          color: TEXT_SECONDARY,
                          textTransform: "uppercase",
                          letterSpacing: "1px",
                          marginBottom: "4px",
                        }}
                      >
                        Due Date
                      </div>
                      <div
                        style={{
                          fontSize: "13px",
                          color: TEXT_PRIMARY,
                          fontWeight: 600,
                        }}
                      >
                        {formatDate(data.dueDate)}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {data.poNumber && (
                <div>
                  <div
                    style={{
                      fontSize: "9px",
                      fontWeight: 700,
                      color: TEXT_SECONDARY,
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                      marginBottom: "4px",
                    }}
                  >
                    Purchase Order
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      color: TEXT_PRIMARY,
                      fontWeight: 600,
                    }}
                  >
                    {data.poNumber}
                  </div>
                </div>
              )}
            </div>
          </div>
          )}

          {/* Line Items Table */}
          {displayItems.length > 0 && (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginBottom: "0",
            }}
          >
            <thead>
              <tr>
                <th
                  style={{
                    textAlign: "left",
                    padding: "12px 16px",
                    color: "#ffffff",
                    fontSize: "11px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    backgroundColor: ACCENT,
                    borderRadius: "4px 0 0 0",
                  }}
                >
                  Description
                </th>
                <th
                  style={{
                    textAlign: "right",
                    padding: "12px 16px",
                    color: "#ffffff",
                    fontSize: "11px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    backgroundColor: ACCENT,
                    width: "110px",
                  }}
                >
                  Unit Cost
                </th>
                <th
                  style={{
                    textAlign: "right",
                    padding: "12px 16px",
                    color: "#ffffff",
                    fontSize: "11px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    backgroundColor: ACCENT,
                    width: "60px",
                  }}
                >
                  Qty
                </th>
                <th
                  style={{
                    textAlign: "right",
                    padding: "12px 16px",
                    color: "#ffffff",
                    fontSize: "11px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    backgroundColor: ACCENT,
                    width: "120px",
                    borderRadius: "0 4px 0 0",
                  }}
                >
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {displayItems.map((item, index) => (
                <tr key={item.id}>
                  <td
                    style={{
                      padding: "12px 16px",
                      fontSize: "12px",
                      color: TEXT_PRIMARY,
                      backgroundColor:
                        index % 2 === 0 ? "#ffffff" : ACCENT_LIGHT,
                      borderBottom: `1px solid ${BORDER}`,
                    }}
                  >
                    {item.description}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      padding: "12px 16px",
                      fontSize: "12px",
                      color: TEXT_SECONDARY,
                      backgroundColor:
                        index % 2 === 0 ? "#ffffff" : ACCENT_LIGHT,
                      borderBottom: `1px solid ${BORDER}`,
                    }}
                  >
                    {formatNumber(item.unitCost)}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      padding: "12px 16px",
                      fontSize: "12px",
                      color: TEXT_SECONDARY,
                      backgroundColor:
                        index % 2 === 0 ? "#ffffff" : ACCENT_LIGHT,
                      borderBottom: `1px solid ${BORDER}`,
                    }}
                  >
                    {item.quantity}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      padding: "12px 16px",
                      fontSize: "12px",
                      color: TEXT_PRIMARY,
                      fontWeight: 600,
                      backgroundColor:
                        index % 2 === 0 ? "#ffffff" : ACCENT_LIGHT,
                      borderBottom: `1px solid ${BORDER}`,
                    }}
                  >
                    {formatNumber(item.unitCost * item.quantity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}

          {/* Summary Section */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: "24px",
              marginBottom: "36px",
            }}
          >
            <div style={{ width: "300px" }}>
              {/* Subtotal */}
              {displayItems.length > 0 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderBottom: `1px solid ${BORDER}`,
                }}
              >
                <span
                  style={{
                    fontSize: "12px",
                    color: TEXT_SECONDARY,
                  }}
                >
                  Subtotal
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    color: TEXT_PRIMARY,
                    fontWeight: 500,
                  }}
                >
                  {formatWithCurrency(subtotal, data.currency)}
                </span>
              </div>
              )}

              {/* Rush Fee */}
              {data.rushFee != null && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderBottom: `1px solid ${BORDER}`,
                }}
              >
                <span style={{ fontSize: "12px", color: TEXT_SECONDARY }}>
                  Rush Fee ({data.rushFee}%)
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    color: TEXT_PRIMARY,
                    fontWeight: 500,
                  }}
                >
                  {formatWithCurrency(rushFeeAmount, data.currency)}
                </span>
              </div>
              )}

              {/* Tax Rate */}
              {data.taxRate != null && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderBottom: `1px solid ${BORDER}`,
                }}
              >
                <span style={{ fontSize: "12px", color: TEXT_SECONDARY }}>
                  Tax ({data.taxRate}%)
                </span>
                <span
                  style={{
                    fontSize: "12px",
                    color: TEXT_PRIMARY,
                    fontWeight: 500,
                  }}
                >
                  {formatWithCurrency(taxAmount, data.currency)}
                </span>
              </div>
              )}

              {/* Discount */}
              {data.discount != null && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 0",
                    borderBottom: `1px solid ${BORDER}`,
                  }}
                >
                  <span style={{ fontSize: "12px", color: TEXT_SECONDARY }}>
                    Discount
                  </span>
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#c0392b",
                      fontWeight: 500,
                    }}
                  >
                    -{formatWithCurrency(data.discount, data.currency)}
                  </span>
                </div>
              )}

              {/* Shipping */}
              {data.shippingFee != null && (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 0",
                    borderBottom: `1px solid ${BORDER}`,
                  }}
                >
                  <span style={{ fontSize: "12px", color: TEXT_SECONDARY }}>
                    Shipping
                  </span>
                  <span
                    style={{
                      fontSize: "12px",
                      color: TEXT_PRIMARY,
                      fontWeight: 500,
                    }}
                  >
                    {formatWithCurrency(data.shippingFee, data.currency)}
                  </span>
                </div>
              )}

              {/* Total */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 16px",
                  marginTop: "8px",
                  backgroundColor: ACCENT,
                  borderRadius: "6px",
                }}
              >
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#ffffff",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Total Due
                </span>
                <span
                  style={{
                    fontSize: "20px",
                    fontWeight: 800,
                    color: "#ffffff",
                  }}
                >
                  {formatWithCurrency(total, data.currency)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer: Terms + Bank Details */}
          {(data.notes || data.bankDetails) && (
            <div
              style={{
                display: "flex",
                gap: "40px",
                paddingTop: "24px",
                borderTop: `1px solid ${BORDER}`,
              }}
            >
              {data.notes && (
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      color: ACCENT,
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                      marginBottom: "8px",
                    }}
                  >
                    Terms & Notes
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: TEXT_SECONDARY,
                      whiteSpace: "pre-line",
                      lineHeight: "1.7",
                    }}
                  >
                    {data.notes}
                  </div>
                </div>
              )}
              {data.bankDetails && (
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: "10px",
                      fontWeight: 700,
                      color: ACCENT,
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                      marginBottom: "8px",
                    }}
                  >
                    Bank Account Details
                  </div>
                  <div
                    style={{
                      fontSize: "11px",
                      color: TEXT_SECONDARY,
                      whiteSpace: "pre-line",
                      lineHeight: "1.7",
                    }}
                  >
                    {data.bankDetails}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  },
);

InvoicePreview.displayName = "InvoicePreview";

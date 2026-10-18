// Loaded only with `await import('../pdf/download')`, so react-pdf and the fonts stay out of the main bundle.
import { createElement } from 'react';
import type { ReactElement } from 'react';
import { pdf } from '@react-pdf/renderer';
import type { DocumentProps } from '@react-pdf/renderer';
import { billDocument, receiptDocument } from '@himan/shared/rentals';
import type { ReceiptContext, RentalBill, RentalPayment, StatementInfo } from '@himan/shared/rentals';
import { BillPdf } from './BillPdf';
import { ReceiptPdf } from './ReceiptPdf';
import { loadQrImages } from './qr';

// BillPdf and ReceiptPdf each return a <Document>; react-pdf's types only see their own props.
const toBlob = (element: ReactElement) => pdf(element as ReactElement<DocumentProps>).toBlob();

/** Downloads the Statement of Account as `Statement-<bill number>.pdf`. */
export async function downloadBillPdf(bill: RentalBill, info: StatementInfo, qrUrl?: (path: string) => string): Promise<void> {
  const doc = billDocument(bill, info);
  const qr = qrUrl ? await loadQrImages(info.accounts ?? [], qrUrl) : {};
  let blob: Blob;
  // A QR image react-pdf still can't draw must not cost the whole bill: print it without the images.
  try { blob = await toBlob(createElement(BillPdf, { doc, qr })); } catch (error) {
    if (!Object.keys(qr).length) throw error;
    blob = await toBlob(createElement(BillPdf, { doc, qr: {} }));
  }
  save(blob, `Statement-${bill.number}.pdf`);
}

/** Downloads the payment's acknowledgment receipt as `Receipt-R-<id>.pdf`. */
export async function downloadReceiptPdf(payment: RentalPayment, ctx: ReceiptContext): Promise<void> {
  const doc = receiptDocument(payment, ctx);
  save(await toBlob(createElement(ReceiptPdf, { doc })), `Receipt-${doc.number}.pdf`);
}

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000); // some browsers read the URL after click() returns
}

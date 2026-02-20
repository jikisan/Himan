import { Resolution, Margin } from 'react-to-pdf';
import type { Options } from 'react-to-pdf';

export const getPDFOptions = (invoiceNumber?: string): Options => ({
  method: 'save',
  filename: invoiceNumber ? `Invoice-${invoiceNumber}.pdf` : 'invoice.pdf',
  resolution: Resolution.HIGH,
  page: {
    margin: Margin.MEDIUM,
    format: 'A4',
    orientation: 'portrait',
  },
  canvas: {
    mimeType: 'image/jpeg',
    qualityRatio: 0.98,
  },
  overrides: {
    pdf: { compress: true },
    canvas: { useCORS: true, backgroundColor: '#ffffff' },
  },
});

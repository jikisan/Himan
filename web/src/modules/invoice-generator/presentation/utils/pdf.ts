import html2pdf from 'html2pdf.js';

export interface PDFOptions {
  margin?: number;
  filename?: string;
  imageType?: 'jpeg' | 'png' | 'webp';
  imageQuality?: number;
  scale?: number;
  format?: 'a4' | 'letter' | 'legal';
  orientation?: 'portrait' | 'landscape';
}

const defaultOptions: PDFOptions = {
  margin: 10,
  filename: 'invoice.pdf',
  imageType: 'jpeg',
  imageQuality: 0.98,
  scale: 2,
  format: 'a4',
  orientation: 'portrait',
};

/**
 * Generate and download a PDF from an HTML element
 */
export const generatePDF = async (
  element: HTMLElement,
  invoiceNumber?: string,
  customOptions?: Partial<PDFOptions>
): Promise<void> => {
  const options = { ...defaultOptions, ...customOptions };
  const filename = invoiceNumber
    ? `Invoice-${invoiceNumber}.pdf`
    : options.filename || defaultOptions.filename;

  const html2pdfOptions = {
    margin: options.margin,
    filename,
    image: { type: options.imageType, quality: options.imageQuality },
    html2canvas: {
      scale: options.scale,
      useCORS: true,
      logging: false,
    },
    jsPDF: {
      unit: 'mm' as const,
      format: options.format,
      orientation: options.orientation,
    },
  };

  await html2pdf().set(html2pdfOptions).from(element).save();
};

/**
 * Generate PDF and return as blob (for preview or custom handling)
 */
export const generatePDFBlob = async (
  element: HTMLElement,
  customOptions?: Partial<PDFOptions>
): Promise<Blob> => {
  const options = { ...defaultOptions, ...customOptions };

  const html2pdfOptions = {
    margin: options.margin,
    image: { type: options.imageType, quality: options.imageQuality },
    html2canvas: {
      scale: options.scale,
      useCORS: true,
      logging: false,
    },
    jsPDF: {
      unit: 'mm' as const,
      format: options.format,
      orientation: options.orientation,
    },
  };

  return await html2pdf().set(html2pdfOptions).from(element).outputPdf('blob');
};

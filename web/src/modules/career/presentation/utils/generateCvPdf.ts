import generatePDF, { Resolution, Margin } from 'react-to-pdf';
import type { Options } from 'react-to-pdf';

// A4 width at 96dpi — render the CV at full page width offscreen so the
// rasterized capture is sharp, independent of the on-screen preview size.
const A4_WIDTH_PX = 794;

const PDF_OPTIONS: Options = {
  method: 'build',
  resolution: Resolution.HIGH,
  page: { margin: Margin.NONE, format: 'A4', orientation: 'portrait' },
  canvas: { mimeType: 'image/jpeg', qualityRatio: 0.98 },
  overrides: {
    pdf: { compress: true },
    canvas: { useCORS: true, backgroundColor: '#ffffff' },
  },
};

// Renders a standalone CV HTML document into an offscreen iframe, rasterizes
// it with react-to-pdf (html2canvas → jsPDF), and returns the PDF bytes.
// react-to-pdf/html2canvas need a laid-out element in a document, so an
// iframe (not the srcDoc preview) is used to isolate the CV's global styles.
export async function generateCvPdfBlob(html: string): Promise<Blob> {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.left = '-10000px';
  iframe.style.top = '0';
  iframe.style.width = `${A4_WIDTH_PX}px`;
  iframe.style.height = '10px';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  try {
    await new Promise<void>((resolve, reject) => {
      iframe.onload = () => resolve();
      iframe.onerror = () => reject(new Error('Failed to render CV for PDF'));
      iframe.srcdoc = html;
    });

    const doc = iframe.contentDocument;
    if (!doc) throw new Error('CV render document unavailable');

    // Grow the iframe to the full content height so html2canvas captures every
    // page's worth of content (react-to-pdf paginates from the tall canvas).
    const body = doc.body;
    iframe.style.height = `${body.scrollHeight}px`;

    const pdf = await generatePDF({ current: body }, PDF_OPTIONS);
    return pdf.output('blob');
  } finally {
    document.body.removeChild(iframe);
  }
}

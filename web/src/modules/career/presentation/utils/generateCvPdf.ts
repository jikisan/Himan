import generatePDF, { Resolution, Margin } from 'react-to-pdf';
import type { Options } from 'react-to-pdf';

// A4 width at 96dpi — render the CV at full page width offscreen so the
// rasterized capture is sharp, independent of the on-screen preview size.
const A4_WIDTH_PX = 794;
const A4_RATIO = 297 / 210; // A4 height / width
// Whitespace kept clear at the top/bottom of every page (px, body coords).
const PAGE_TOP_MARGIN = 40;
const PAGE_BOTTOM_MARGIN = 40;

// react-to-pdf rasterizes the body to one tall image and slices it every
// page-height with no regard for content, so a heading or line of text sitting
// on a page boundary gets bisected. Walk the top-level blocks and bump any
// block that would straddle a boundary onto the next page, which also gives
// each page a top margin (bumped blocks land below the cut).
function paginate(body: HTMLElement): void {
  const pageHeight = body.clientWidth * A4_RATIO;
  const bandBottom = pageHeight - PAGE_BOTTOM_MARGIN;
  let page = 0;
  for (const el of Array.from(body.children) as HTMLElement[]) {
    const bottom = el.offsetTop + el.offsetHeight;
    if (bottom > page * pageHeight + bandBottom) {
      page++;
      const target = page * pageHeight + PAGE_TOP_MARGIN;
      const currentMargin = parseFloat(getComputedStyle(el).marginTop) || 0;
      el.style.marginTop = `${currentMargin + (target - el.offsetTop)}px`;
    }
  }
}

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

    // Bump blocks off page boundaries, then re-grow for the added spacing.
    paginate(body);
    iframe.style.height = `${body.scrollHeight}px`;

    const pdf = await generatePDF({ current: body }, PDF_OPTIONS);
    return pdf.output('blob');
  } finally {
    document.body.removeChild(iframe);
  }
}

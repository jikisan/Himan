// Single column, real selectable text, no tables/icons — ATS-safe. Layout
// mirrors the portfolio résumé generator (Helvetica, centered header,
// uppercase section headings with a full-width rule, bold title + right date).
// Rendered at a fixed 794px (A4 @96dpi) so the on-screen preview and the
// rasterized PDF wrap identically — the preview shows exactly the output.
export const CV_PRINT_CSS = `
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
html { background: #ffffff; }
body {
  font-family: Helvetica, Arial, sans-serif;
  font-size: 10pt;
  line-height: 1.4;
  color: #000000;
  background: #ffffff;
  width: 794px;
  margin: 0 auto;
  padding: 57px;
}
h1 { font-size: 22pt; font-weight: bold; text-align: center; margin: 0 0 6px; }
.contact-line { text-align: center; font-size: 9pt; color: #000; margin: 0 0 2px; }
.contact-line:last-of-type { margin-bottom: 18px; }
h2 {
  font-size: 12pt;
  font-weight: bold;
  text-transform: uppercase;
  border-bottom: 0.5px solid #000;
  padding-bottom: 2px;
  margin: 16px 0 8px;
}
.entry { margin: 0 0 10px; }
.entry-row { display: flex; justify-content: space-between; gap: 12px; }
.entry-title { font-weight: bold; }
.entry-dates { white-space: nowrap; font-weight: bold; }
.entry-platform { white-space: nowrap; color: #666; }
.entry-subtitle { font-style: italic; }
.entry-company { color: #666; }
.entry-tech { margin: 4px 0 0; padding-left: 14px; }
.entry-tech-label { font-weight: bold; }
p { margin: 4px 0; }
ul { margin: 4px 0 0; padding-left: 18px; }
li { margin: 0 0 2px; }
`;

// Single column, real selectable text, no tables/icons — same ATS-safe
// discipline as the cover letter's PRINT_CSS, extended with the headings,
// rules and right-aligned date rows a résumé needs.
export const CV_PRINT_CSS = `
@page { size: A4; margin: 16mm; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
html { background: #ffffff; }
body {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 10.5pt;
  line-height: 1.5;
  color: #1a1a1a;
  background: #ffffff;
  max-width: 720px;
  margin: 0 auto;
  padding: 40px 24px;
}
h1 { font-size: 20pt; text-align: center; margin: 0 0 4px; }
.contact-line { text-align: center; font-size: 9.5pt; color: #444; margin: 0 0 24px; }
h2 {
  font-size: 11pt;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid #1a1a1a;
  padding-bottom: 2px;
  margin: 20px 0 8px;
}
.entry { margin: 0 0 10px; }
.entry-row { display: flex; justify-content: space-between; gap: 12px; }
.entry-title { font-weight: bold; }
.entry-dates { white-space: nowrap; color: #444; }
.entry-subtitle { font-style: italic; color: #333; }
ul { margin: 4px 0 0; padding-left: 18px; }
li { margin: 0 0 2px; }
button.no-print {
  display: block;
  margin: 0 0 24px;
  padding: 8px 16px;
  font-size: 14px;
  font-family: system-ui, sans-serif;
  cursor: pointer;
}
@media print {
  button.no-print { display: none; }
  body { padding: 0; max-width: none; }
}
`;

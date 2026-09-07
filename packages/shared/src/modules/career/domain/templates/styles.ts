// Single column, no tables, no icons, real selectable text — decorative
// layouts break ATS parsers. Shared by the letter template; both what a
// recruiter opens and what the browser prints use the same rules.
export const PRINT_CSS = `
@page { size: A4; margin: 20mm; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: Georgia, 'Times New Roman', serif;
  font-size: 12pt;
  line-height: 1.6;
  color: #1a1a1a;
  max-width: 680px;
  margin: 0 auto;
  padding: 48px 24px;
}
p { margin: 0 0 1em; white-space: pre-wrap; }
button.no-print {
  display: block;
  margin: 0 0 32px;
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

import { PRINT_CSS } from './styles.js';
import type { LetterHtmlData } from '../types/index.js';

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Standalone document: what a recruiter opens via the share link and what
// the browser prints are the same bytes, so the two cannot drift. bodyText
// is expected pre-composed (already includes greeting through close);
// paragraphs are split on blank lines.
export function renderLetterHtml(data: LetterHtmlData): string {
  const paragraphs = data.bodyText
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`)
    .join('\n');

  const title = escapeHtml(data.documentTitle);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<style>${PRINT_CSS}</style>
</head>
<body>
<button class="no-print" onclick="window.print()">Save as PDF</button>
${paragraphs}
</body>
</html>`;
}

// Node-only helpers for PDF tests (`// @vitest-environment node`). Node modules are loaded by name because web's
// tsconfig has no node types.
const load = (name: string) => import(/* @vite-ignore */ name);

/**
 * The PDF's text through poppler's `pdftotext -layout`, or null when poppler isn't installed.
 * Set PDF_OUT=<dir> to keep a copy as <dir>/<name>.pdf for looking at (`pdftoppm -png -r 60`).
 */
export async function pdfText(pdf: Uint8Array, name = 'doc'): Promise<string | null> {
  const [{ execFileSync }, { mkdtempSync, writeFileSync }, { tmpdir }, { join }, { env }] =
    await Promise.all(['node:child_process', 'node:fs', 'node:os', 'node:path', 'node:process'].map(load));
  const file = join(env.PDF_OUT || mkdtempSync(join(tmpdir(), 'rentals-pdf-')), `${name}.pdf`);
  writeFileSync(file, pdf);
  try { return execFileSync('pdftotext', ['-layout', file, '-'], { encoding: 'utf8' }); } catch { return null; }
}

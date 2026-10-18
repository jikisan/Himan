// Node-only helpers for PDF tests (`// @vitest-environment node`). Node modules are loaded by name because web's
// tsconfig has no node types.
const load = (name: string) => import(/* @vite-ignore */ name);

/**
 * The PDF's text through poppler's `pdftotext -layout`. Without poppler: throws in CI, otherwise checks that the
 * Noto Sans font was embedded (the ₱ fix) and returns null so the caller skips only its text checks.
 * Set PDF_OUT=<dir> to keep a copy as <dir>/<name>.pdf for looking at (`pdftoppm -png -r 60`).
 */
export async function pdfText(pdf: Uint8Array, name = 'doc'): Promise<string | null> {
  const [{ execFileSync }, { mkdtempSync, writeFileSync }, { tmpdir }, { join }, { env }] =
    await Promise.all(['node:child_process', 'node:fs', 'node:os', 'node:path', 'node:process'].map(load));
  const file = join(env.PDF_OUT || mkdtempSync(join(tmpdir(), 'rentals-pdf-')), `${name}.pdf`);
  writeFileSync(file, pdf);
  try { return execFileSync('pdftotext', ['-layout', file, '-'], { encoding: 'utf8' }); } catch (error) {
    if ((error as { code?: string }).code !== 'ENOENT') throw error;
    if (env.CI) throw new Error('pdftotext (poppler) is required in CI');
    if (!new TextDecoder('latin1').decode(pdf).includes('NotoSans')) throw new Error('The PDF does not embed NotoSans');
    return null;
  }
}

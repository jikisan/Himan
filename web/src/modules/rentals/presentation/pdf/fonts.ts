import { Font } from '@react-pdf/renderer';
// Noto Sans (OFL). The latin subset has the text; ₱ (U+20B1) is only in latin-ext, so it is the fallback family.
// WOFF, not WOFF2: react-pdf can’t read WOFF2. Inlined (data URLs in the PDF chunk) so a PDF still renders offline.
import regular from '@fontsource/noto-sans/files/noto-sans-latin-400-normal.woff?inline';
import bold from '@fontsource/noto-sans/files/noto-sans-latin-700-normal.woff?inline';
import extRegular from '@fontsource/noto-sans/files/noto-sans-latin-ext-400-normal.woff?inline';
import extBold from '@fontsource/noto-sans/files/noto-sans-latin-ext-700-normal.woff?inline';

export const FONT = ['NotoSans', 'NotoSansExt'];
let registered = false;

/** Registers the PDF fonts once. The built-in Helvetica prints ₱ as ±. */
export function registerPdfFonts(): void {
  if (registered) return;
  registered = true;
  Font.register({ family: 'NotoSans', fonts: [{ src: regular }, { src: bold, fontWeight: 700 }] });
  Font.register({ family: 'NotoSansExt', fonts: [{ src: extRegular }, { src: extBold, fontWeight: 700 }] });
  Font.registerHyphenationCallback((word) => [word]); // never split words with hyphens
}

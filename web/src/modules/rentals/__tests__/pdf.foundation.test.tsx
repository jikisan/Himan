// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Document, Page, Text, renderToBuffer } from '@react-pdf/renderer';
import { registerPdfFonts } from '../presentation/pdf/fonts';
import { styles } from '../presentation/pdf/styles';
import { pdfText } from './pdfText';

describe('pdf foundation', () => {
  it('prints the peso sign in regular and bold', async () => {
    registerPdfFonts();
    registerPdfFonts(); // idempotent
    const pdf = await renderToBuffer(<Document><Page style={styles.page}>
      <Text>Total ₱10,000</Text><Text style={styles.bold}>Due ₱1,234.50</Text>
    </Page></Document>);
    expect(new TextDecoder('latin1').decode(pdf)).toContain('NotoSans');
    const text = await pdfText(pdf, 'foundation');
    if (text !== null) {
      expect(text).toContain('₱10,000');
      expect(text).toContain('₱1,234.50');
    }
  });

  describe('without poppler', () => {
    afterEach(() => vi.unstubAllEnvs());
    const pdf = () => renderToBuffer(<Document><Page style={styles.page}><Text>₱1</Text></Page></Document>);

    it('fails in CI instead of skipping the text checks', async () => {
      vi.stubEnv('PATH', ''); vi.stubEnv('CI', 'true');
      await expect(pdfText(await pdf())).rejects.toThrow('pdftotext');
    });

    it('checks the embedded font instead', async () => {
      vi.stubEnv('PATH', ''); vi.stubEnv('CI', '');
      expect(await pdfText(await pdf())).toBeNull();
      await expect(pdfText(new TextEncoder().encode('%PDF-1.3 Helvetica'))).rejects.toThrow();
    });
  });
});

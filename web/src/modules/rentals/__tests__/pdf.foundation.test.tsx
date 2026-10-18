// @vitest-environment node
import { describe, expect, it } from 'vitest';
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
});

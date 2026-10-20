// The en-PH entry only: the package root bundles every locale.
import { ToWords } from 'to-words/en-PH';

const words = new ToWords({ converterOptions: { currency: true, ignoreZeroCurrency: true } });

/** An amount for a receipt, e.g. 2000050 → "Twenty Thousand Pesos And Fifty Centavos Only". */
export function pesosInWords(centavos: number): string {
  if (!Number.isSafeInteger(centavos) || centavos < 0) throw new Error('Amount must be whole centavos, zero or more');
  return centavos === 0 ? 'Zero Pesos Only' : words.convert(centavos / 100);
}

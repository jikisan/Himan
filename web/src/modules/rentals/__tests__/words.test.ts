import { describe, expect, it } from 'vitest';
import { pesosInWords } from '@himan/shared/rentals';

describe('pesosInWords', () => {
  it('writes pesos and centavos the way a receipt says them', () => {
    expect(pesosInWords(2_000_050)).toBe('Twenty Thousand Pesos And Fifty Centavos Only');
    expect(pesosInWords(100)).toBe('One Peso Only');
    expect(pesosInWords(100_000_001)).toBe('One Million Pesos And One Centavo Only');
    expect(pesosInWords(350_000)).toBe('Three Thousand Five Hundred Pesos Only');
  });
  it('drops "Zero Pesos" below one peso', () => {
    expect(pesosInWords(50)).toBe('Fifty Centavos Only');
    expect(pesosInWords(1)).toBe('One Centavo Only');
    expect(pesosInWords(0)).toBe('Zero Pesos Only');
  });
  it('gets every centavo right (no float drift)', () => {
    expect(pesosInWords(115)).toBe('One Peso And Fifteen Centavos Only');
    expect(pesosInWords(1_999_999_999)).toBe(
      'Nineteen Million Nine Hundred Ninety Nine Thousand Nine Hundred Ninety Nine Pesos And Ninety Nine Centavos Only');
  });
  it('refuses negative or fractional centavos', () => {
    expect(() => pesosInWords(-1)).toThrow();
    expect(() => pesosInWords(10.5)).toThrow();
    expect(() => pesosInWords(Number.NaN)).toThrow();
  });
});

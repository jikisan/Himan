import { describe, expect, it } from 'vitest';
import {
  CARD_COLOR_PRESETS,
  cardForegroundFor,
  getCardColorTheme,
  isValidCardColor,
  normalizeCardColor,
  shadeCardColor,
} from '@himan/shared/cards';

describe('card color helper', () => {
  it('normalizes hex input', () => {
    expect(normalizeCardColor('#ABC')).toBe('#aabbcc');
    expect(normalizeCardColor(' 4F46E5 ')).toBe('#4f46e5');
    expect(normalizeCardColor('red')).toBeNull();
    expect(normalizeCardColor('#12345')).toBeNull();
    expect(normalizeCardColor(null)).toBeNull();
  });
  it('validates only #rrggbb', () => {
    expect(isValidCardColor('#4f46e5')).toBe(true);
    expect(isValidCardColor('#fff')).toBe(false);
    expect(isValidCardColor(null)).toBe(false);
  });
  it('picks a readable foreground', () => {
    expect(cardForegroundFor('#000000')).toBe('#ffffff');
    expect(cardForegroundFor('#ffffff')).toBe('#111827');
    expect(cardForegroundFor('#facc15')).toBe('#111827');
    expect(cardForegroundFor('#4f46e5')).toBe('#ffffff');
  });
  it('gives every preset a theme with contrast of at least 4.5', () => {
    const lum = (h: string) => {
      const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
        .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    };
    for (const { hex } of CARD_COLOR_PRESETS) {
      const t = getCardColorTheme(hex);
      const [a, b] = [lum(hex), lum(t.foreground)].sort((x, y) => y - x);
      expect((a + 0.05) / (b + 0.05)).toBeGreaterThanOrEqual(4.5);
    }
  });
  it('shades toward white and black', () => {
    expect(shadeCardColor('#000000', 1)).toBe('#ffffff');
    expect(shadeCardColor('#ffffff', -1)).toBe('#000000');
  });
});

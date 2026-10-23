// Card face colors: preset palette, hex validation and automatic legible foreground.

export const CARD_COLOR_PRESETS: ReadonlyArray<{ name: string; hex: string }> = [
  { name: 'Indigo', hex: '#4f46e5' },
  { name: 'Ocean', hex: '#0369a1' },
  { name: 'Teal', hex: '#0f766e' },
  { name: 'Forest', hex: '#15803d' },
  { name: 'Gold', hex: '#facc15' },
  { name: 'Orange', hex: '#ea580c' },
  { name: 'Crimson', hex: '#be123c' },
  { name: 'Plum', hex: '#7e22ce' },
  { name: 'Rose', hex: '#fbcfe8' },
  { name: 'Slate', hex: '#334155' },
  { name: 'Black', hex: '#111827' },
  { name: 'Silver', hex: '#e2e8f0' },
];

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export const isValidCardColor = (value: unknown): value is string =>
  typeof value === 'string' && HEX_RE.test(value);

/** Accepts "abc", "#abc", "aabbcc" or "#AABBCC"; returns lowercase "#rrggbb" or null. */
export const normalizeCardColor = (input: string | null | undefined): string | null => {
  if (!input) return null;
  let v = input.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(v)) v = v.split('').map((c) => c + c).join('');
  return /^[0-9a-fA-F]{6}$/.test(v) ? `#${v.toLowerCase()}` : null;
};

const toRgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

const toHex = (rgb: number[]): string =>
  '#' + rgb.map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')).join('');

/** Mix a color toward white (amount > 0) or black (amount < 0), amount in -1..1. */
export const shadeCardColor = (hex: string, amount: number): string => {
  const target = amount >= 0 ? 255 : 0;
  const a = Math.abs(amount);
  return toHex(toRgb(hex).map((c) => c + (target - c) * a));
};

const channel = (c: number): number => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};

/** WCAG relative luminance, 0..1. */
export const cardColorLuminance = (hex: string): number => {
  const [r, g, b] = toRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
};

const DARK_TEXT = '#111827';
const LIGHT_TEXT = '#ffffff';

/** Foreground (white or near-black) with the higher WCAG contrast on the given color. */
export const cardForegroundFor = (hex: string): string => {
  const l = cardColorLuminance(hex);
  const whiteContrast = 1.05 / (l + 0.05);
  const darkContrast = (l + 0.05) / (cardColorLuminance(DARK_TEXT) + 0.05);
  return darkContrast > whiteContrast ? DARK_TEXT : LIGHT_TEXT;
};

export interface CardColorTheme {
  /** Gradient stops, light to dark, all derived from the chosen color. */
  stops: [string, string, string];
  foreground: string;
  /** True when the foreground is light (card face is dark). */
  isDark: boolean;
}

export const getCardColorTheme = (hex: string): CardColorTheme => {
  const stops: [string, string, string] = [shadeCardColor(hex, 0.12), hex, shadeCardColor(hex, -0.22)];
  const foreground = cardForegroundFor(hex);
  return { stops, foreground, isDark: foreground === LIGHT_TEXT };
};

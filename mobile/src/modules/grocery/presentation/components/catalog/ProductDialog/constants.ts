import { Easing } from 'react-native-reanimated';

// Strong ease-out for the dialog entrance — built-in curves feel weak.
export const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

// Filled, borderless inputs read as softer/more tactile than hairline outlines.
export const INPUT =
  'rounded-xl bg-surface dark:bg-surface-dark px-3 py-2.5 text-ink dark:text-ink-dark font-serif';
// For inputs sitting inside a surface-colored card — paper fill keeps contrast.
export const INPUT_CARD =
  'rounded-lg bg-paper dark:bg-paper-dark px-3 py-2 text-ink dark:text-ink-dark font-serif';
export const LABEL =
  'text-[11px] uppercase tracking-[1.5px] text-ink-soft dark:text-ink-softdark font-serif mb-1.5';

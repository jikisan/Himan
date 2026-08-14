// Broadsheet palette as JS constants — for reanimated / SVG / inline styles
// where NativeWind className tokens can't reach. Mirrors tailwind.config.js.

export const notebook = {
  light: {
    paper: '#f3f2f2',
    surface: '#eae9e9',
    rule: 'rgba(32,30,29,0.16)',
    ink: '#201e1d',
    inkSoft: '#7d7979',
    inkFaint: '#9b9797',
    margin: '#aa0b56', // destructive
    danger: '#aa0b56',
    accent: '#0088b0', // fills & icons
    accentText: '#006786', // text-sized accent
    sticky: '#e9f8ff',
  },
  dark: {
    paper: '#1a1918',
    surface: '#242220',
    rule: 'rgba(236,233,230,0.16)',
    ink: '#ece9e6',
    inkSoft: '#9b9590',
    inkFaint: '#736e69',
    margin: '#e0568f',
    danger: '#e0568f',
    accent: '#3bb6d8',
    accentText: '#5cc4e0',
    sticky: '#0c2b34',
  },
} as const;

export type NotebookScheme = keyof typeof notebook;

// One accent now — category tags render as flush-left cyan #tags, not colored
// dots. Kept for any callers that still want a per-category tint.
export function categoryColor(_category: string | null | undefined): string {
  return '#0088b0';
}

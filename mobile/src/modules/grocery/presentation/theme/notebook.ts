// Notebook palette as JS constants — for reanimated / SVG / inline styles
// where NativeWind className tokens can't reach. Mirrors tailwind.config.js.

export const notebook = {
  light: {
    paper: '#F7F3E9',
    rule: '#D8E3F0',
    ink: '#2B2A26',
    inkSoft: '#6B675C',
    margin: '#E07A5F',
    accent: '#3D5A80',
    sticky: '#FFE8A3',
  },
  dark: {
    paper: '#1C1B18',
    rule: '#33465C',
    ink: '#EDE8DA',
    inkSoft: '#9A9382',
    margin: '#E07A5F',
    accent: '#98C1D9',
    sticky: '#4A422A',
  },
} as const;

export type NotebookScheme = keyof typeof notebook;

// Colored category chips. Keys are lowercased category names; unknown
// categories fall back to a neutral ink tone.
const CATEGORY_COLORS: Record<string, string> = {
  produce: '#7FB069',
  dairy: '#8ECae6',
  meat: '#E07A5F',
  bakery: '#E0A458',
  frozen: '#6C9BD1',
  pantry: '#C9A66B',
  beverages: '#5FA8A0',
  snacks: '#D98CB3',
  household: '#9A8FB8',
  'personal care': '#E39EC1',
  other: '#A8A296',
};

export function categoryColor(category: string | null | undefined): string {
  if (!category) return CATEGORY_COLORS.other;
  return CATEGORY_COLORS[category.toLowerCase()] ?? CATEGORY_COLORS.other;
}

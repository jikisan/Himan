// Fixed suggested categories (free text still allowed). Color mapping is a
// presentation concern and lives in each platform's theme layer.
export const SUGGESTED_CATEGORIES = [
  'Produce',
  'Dairy',
  'Meat',
  'Bakery',
  'Frozen',
  'Pantry',
  'Beverages',
  'Snacks',
  'Household',
  'Personal Care',
  'Other',
] as const;

export type SuggestedCategory = (typeof SUGGESTED_CATEGORIES)[number];

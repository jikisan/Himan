/** Every module that can appear as a button on the dashboard, in display order. */
export const DASHBOARD_APP_IDS = [
  'notes',
  'passwords',
  'cards',
  'grocery',
  'rentals',
  'weight',
  'government',
  'receipts',
  'storage',
  'invoices',
  'career',
  'profile',
] as const;

export type DashboardAppId = (typeof DASHBOARD_APP_IDS)[number];

/**
 * The choice is stored as the apps a user has hidden, not the ones they show,
 * so a module added later appears on everyone's dashboard by default.
 */
export const HIDDEN_APPS_METADATA_KEY = 'dashboard_hidden_apps';

export const isDashboardAppId = (value: unknown): value is DashboardAppId =>
  typeof value === 'string' && (DASHBOARD_APP_IDS as readonly string[]).includes(value);

/** Reads the hidden apps from the user's metadata, ignoring anything malformed or unknown. */
export const readHiddenApps = (metadata: Record<string, unknown> | undefined): DashboardAppId[] => {
  const value = metadata?.[HIDDEN_APPS_METADATA_KEY];
  return Array.isArray(value) ? value.filter(isDashboardAppId) : [];
};

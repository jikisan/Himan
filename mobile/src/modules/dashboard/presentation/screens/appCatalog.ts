import type { Feather } from '@expo/vector-icons';
import type { DashboardAppId } from '@himan/shared/dashboard';

export interface MobileApp { id: DashboardAppId; label: string; route: string; icon: React.ComponentProps<typeof Feather>['name']; color: string }

/** The apps the phone has, in the shared dashboard order, with the web dashboard's icon colours. */
export const MOBILE_APPS: MobileApp[] = [
  { id: 'passwords', label: 'Passwords', route: '/(app)/passwords', icon: 'key', color: '#475569' },
  { id: 'cards', label: 'Cards', route: '/(app)/cards', icon: 'credit-card', color: '#4f46e5' },
  { id: 'grocery', label: 'Grocery', route: '/(app)/grocery', icon: 'shopping-cart', color: '#ea580c' },
  { id: 'rentals', label: 'Rentals', route: '/(app)/rentals', icon: 'home', color: '#d97706' },
  { id: 'weight', label: 'Weight', route: '/(app)/weight', icon: 'activity', color: '#059669' },
  { id: 'finances', label: 'Finances', route: '/(app)/finances', icon: 'dollar-sign', color: '#16a34a' },
  { id: 'government', label: 'Government', route: '/(app)/government', icon: 'file-text', color: '#0d9488' },
  { id: 'receipts', label: 'Receipts', route: '/(app)/receipts', icon: 'file', color: '#65a30d' },
];

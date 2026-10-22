import { Briefcase, Building2, CreditCard, FileText, HardDrive, KeyRound, Landmark, Receipt, ReceiptText, ShoppingCart, User, type LucideIcon } from 'lucide-react';
import type { DashboardAppId } from '../../domain/entities';

export interface DashboardApp {
  id: DashboardAppId;
  label: string;
  to: string;
  icon: LucideIcon;
  /** Tailwind gradient stops for the app icon. */
  color: string;
  /** Storage is limited to Enterprise and admins, as it is in the sidebar. */
  needsStorageAccess?: boolean;
}

export const DASHBOARD_APPS: Record<DashboardAppId, DashboardApp> = {
  notes: { id: 'notes', label: 'Notes', to: '/notes', icon: FileText, color: 'from-amber-300 to-yellow-500' },
  passwords: { id: 'passwords', label: 'Passwords', to: '/passwords', icon: KeyRound, color: 'from-slate-500 to-slate-700' },
  cards: { id: 'cards', label: 'Cards', to: '/cards', icon: CreditCard, color: 'from-indigo-400 to-indigo-600' },
  grocery: { id: 'grocery', label: 'Grocery', to: '/grocery', icon: ShoppingCart, color: 'from-orange-400 to-red-500' },
  rentals: { id: 'rentals', label: 'Rentals', to: '/rentals', icon: Building2, color: 'from-amber-400 to-orange-600' },
  government: { id: 'government', label: 'Government', to: '/government', icon: Landmark, color: 'from-teal-400 to-teal-600' },
  receipts: { id: 'receipts', label: 'Receipts', to: '/receipts', icon: ReceiptText, color: 'from-lime-400 to-green-600' },
  storage: { id: 'storage', label: 'Storage', to: '/storage', icon: HardDrive, color: 'from-sky-400 to-blue-600', needsStorageAccess: true },
  invoices: { id: 'invoices', label: 'Invoices', to: '/invoice-generator', icon: Receipt, color: 'from-emerald-400 to-green-600' },
  career: { id: 'career', label: 'Career', to: '/career', icon: Briefcase, color: 'from-violet-400 to-purple-600' },
  profile: { id: 'profile', label: 'Profile', to: '/profile', icon: User, color: 'from-rose-400 to-pink-600' },
};

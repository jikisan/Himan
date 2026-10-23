import { format, parseISO } from 'date-fns';

export const formatPeso = (amount: number) =>
  new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);

/** yyyy-MM-dd → "Oct 24, 2026", without the time-zone shift `new Date(string)` would add. */
export const formatDate = (iso: string) => format(parseISO(iso), 'MMM d, yyyy');

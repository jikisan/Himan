import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { receiptAttention, statusLabel } from '@himan/shared/receipts';
import type { Receipt } from '@himan/shared/receipts';

const tone = {
  expired: 'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200',
  today: 'bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-100',
  soon: 'bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-100',
  ok: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200',
  none: '',
} as const;

/** Warranty / expiry status in words and colour, so colour is never the only signal. */
export function StatusChip({ receipt, today }: { receipt: Pick<Receipt, 'warrantyEndsOn' | 'expiresOn'>; today: string }) {
  const attention = receiptAttention(receipt, today);
  if (!attention) return null;
  const { kind } = attention.status;
  const Icon = kind === 'ok' ? CheckCircle2 : kind === 'expired' ? AlertTriangle : Clock;
  return <span data-status={kind} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${tone[kind]}`}>
    <Icon aria-hidden="true" className="h-4 w-4" />{statusLabel(attention)}
  </span>;
}

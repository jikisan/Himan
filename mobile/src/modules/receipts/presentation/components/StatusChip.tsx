import { Text, View } from 'react-native';
import { receiptAttention, statusLabel } from '@himan/shared/receipts';
import type { Receipt } from '@himan/shared/receipts';

const tone = {
  expired: 'bg-red-100 dark:bg-red-950', today: 'bg-amber-100 dark:bg-amber-950', soon: 'bg-amber-100 dark:bg-amber-950',
  ok: 'bg-emerald-100 dark:bg-emerald-950', none: '',
} as const;
const textTone = {
  expired: 'text-red-900 dark:text-red-200', today: 'text-amber-950 dark:text-amber-100', soon: 'text-amber-950 dark:text-amber-100',
  ok: 'text-emerald-900 dark:text-emerald-200', none: '',
} as const;

/** Warranty / expiry status in words and colour. */
export function StatusChip({ receipt, today }: { receipt: Pick<Receipt, 'warrantyEndsOn' | 'expiresOn'>; today: string }) {
  const attention = receiptAttention(receipt, today);
  if (!attention) return null;
  const { kind } = attention.status;
  return <View className={`self-start rounded-full px-3 py-1.5 ${tone[kind]}`}><Text className={`text-sm font-medium ${textTone[kind]}`}>{statusLabel(attention)}</Text></View>;
}

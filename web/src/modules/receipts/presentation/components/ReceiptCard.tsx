import { motion } from 'motion/react';
import type { Receipt } from '@himan/shared/receipts';
import { formatPeso, formatDate } from '../utils/format';
import { Photo } from './Photo';
import { StatusChip } from './StatusChip';

export function ReceiptCard({ receipt, photoUrl, today, onOpen }: { receipt: Receipt; photoUrl?: string; today: string; onOpen: () => void }) {
  return <motion.li layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
    transition={{ duration: 0.25 }} className="list-none">
    <button type="button" onClick={onOpen} aria-label={`Open ${receipt.merchant} receipt`}
      className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border bg-card text-left shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none">
      <Photo src={photoUrl} alt={`Photo of the ${receipt.merchant} receipt`} className="aspect-[4/3] w-full" />
      <span className="flex flex-1 flex-col gap-2 p-4">
        <span className="flex items-baseline justify-between gap-3">
          <span className="min-w-0 break-words text-lg font-semibold leading-6">{receipt.merchant}</span>
          <span className="shrink-0 text-lg font-semibold tabular-nums">{formatPeso(receipt.amount)}</span>
        </span>
        <span className="text-sm text-muted-foreground">{formatDate(receipt.purchasedOn)}</span>
        <StatusChip receipt={receipt} today={today} />
        {receipt.tags.length > 0 && <span className="flex flex-wrap gap-1.5">
          {receipt.tags.map((tag) => <span key={tag} className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium">{tag}</span>)}
        </span>}
      </span>
    </button>
  </motion.li>;
}

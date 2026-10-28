import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addPeriods, periodLabel } from '@himan/shared/rentals';
import { Button } from '@/components/ui/button';

/** The month bar Bills and Analytics share: Previous, the month, Next. */
export function MonthBar({ period, onChange, min, max }: { period: string; onChange(period: string): void; min?: string; max?: string }) {
  return <div className="flex max-w-sm items-center justify-between gap-2 rounded-2xl border bg-card p-1 shadow-sm">
    <Button variant="ghost" className="h-11 px-3 sm:h-9" aria-label="Previous month" disabled={!!min && period <= min}
      onClick={() => onChange(addPeriods(period, -1))}><ChevronLeft aria-hidden className="h-4 w-4" />Previous</Button>
    <h2 className="text-center text-base font-semibold">{periodLabel(period)}</h2>
    <Button variant="ghost" className="h-11 px-3 sm:h-9" aria-label="Next month" disabled={!!max && period >= max}
      onClick={() => onChange(addPeriods(period, 1))}>Next<ChevronRight aria-hidden className="h-4 w-4" /></Button>
  </div>;
}

import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import { billBalance, billPaid, billState, billTotal, formatBillPesos } from '@himan/shared/rentals';
import type { RentalBill, RentalPayment } from '@himan/shared/rentals';

export type MoneyTone = 'due' | 'late' | 'paid' | 'cancelled';

/** What a bill row says, in words: how much is left to pay and whether it is late. */
export function billMoney(bill: RentalBill, payments: RentalPayment[], today: string): { tone: MoneyTone; headline: string; detail: string } {
  const total = formatBillPesos(billTotal(bill.lines));
  const state = billState(bill, payments, today);
  if (state === 'void') return { tone: 'cancelled', headline: 'Cancelled', detail: total };
  if (state === 'paid') return { tone: 'paid', headline: 'Paid in full', detail: total };
  const paid = billPaid(bill.id, payments);
  const left = formatBillPesos(billBalance(bill, payments));
  const late = differenceInCalendarDays(parseISO(today), parseISO(bill.dueOn));
  const when = state === 'overdue' ? `${late} day${late === 1 ? '' : 's'} late` : `Due ${format(parseISO(bill.dueOn), 'MMM d')}`;
  return {
    tone: state === 'overdue' ? 'late' : 'due',
    headline: paid > 0 ? `${left} left to pay` : `${left} to pay`,
    detail: paid > 0 ? `${formatBillPesos(paid)} paid of ${total}. ${when}` : when,
  };
}

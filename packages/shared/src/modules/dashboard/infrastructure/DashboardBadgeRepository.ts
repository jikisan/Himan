import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import { getSupabase } from '../../../config/index.js';
import { expiringSoon } from '../../receipts/index.js';
import { BillRepository, PaymentRepository, billState, nextDueDate } from '../../rentals/index.js';
import type { RentalBill, RentalPayment } from '../../rentals/index.js';
import type { DashboardAppId } from '../domain/dashboardApps.js';

/** A bill or card payment due this close (in days, inclusive) counts as needing attention, like the rentals "Due soon" list. */
export const DUE_SOON_DAYS = 7;

export type BadgeCounts = Partial<Record<DashboardAppId, number>>;

/** Cards whose monthly due day falls within the next DUE_SOON_DAYS days (today included). */
export const cardsDueSoon = (dueDays: (number | null)[], today: string): number => dueDays.filter((day) =>
  day != null && differenceInCalendarDays(parseISO(nextDueDate(day, today)), parseISO(today)) <= DUE_SOON_DAYS).length;

/** Bills with money still owed that are overdue or due within the next DUE_SOON_DAYS days. */
export const billsDueSoon = (bills: RentalBill[], payments: RentalPayment[], today: string): number => {
  const soon = format(addDays(parseISO(today), DUE_SOON_DAYS), 'yyyy-MM-dd');
  return bills.filter((b) => b.dueOn <= soon && ['overdue', 'unpaid', 'partial'].includes(billState(b, payments, today))).length;
};

/**
 * How many things need attention in each module, for the dashboard tile badges. Each count is fetched on its own,
 * so one failing (or a module the user can't open) just leaves that tile without a badge.
 */
export class DashboardBadgeRepository {
  async counts(userId: string, today: string): Promise<BadgeCounts> {
    const db = getSupabase();
    const [rentals, receipts, cards] = await Promise.allSettled([
      Promise.all([new BillRepository().findAll(), new PaymentRepository().findAll()])
        .then(([bills, payments]) => billsDueSoon(bills, payments, today)),
      db.from('receipts').select('warranty_ends_on, expires_on').eq('user_id', userId)
        .or('warranty_ends_on.not.is.null,expires_on.not.is.null')
        .then(({ data, error }) => {
          if (error) throw error;
          return expiringSoon((data ?? []).map((r) => ({ warrantyEndsOn: r.warranty_ends_on, expiresOn: r.expires_on })), today).length;
        }),
      db.from('credit_cards').select('due_day').eq('user_id', userId).not('due_day', 'is', null)
        .then(({ data, error }) => { if (error) throw error; return cardsDueSoon((data ?? []).map((c) => c.due_day), today); }),
    ]);
    const value = (r: PromiseSettledResult<number>) => (r.status === 'fulfilled' ? r.value : 0);
    return { rentals: value(rentals), receipts: value(receipts), cards: value(cards) };
  }
}

import { addYears, format, parseISO } from 'date-fns';
import type { RentalTenancy, RentalUnit } from './types.js';

/** Contract defaults for "Add tenant": one year, due on the property's due day (else the move-in day), one month advance and deposit. */
export function moveInDefaults(moveIn: string, rentCentavos: number, rentDueDay?: number | null) {
  return { startDate: moveIn, endDate: format(addYears(parseISO(moveIn), 1), 'yyyy-MM-dd'),
    dueDay: rentDueDay ?? Number(moveIn.slice(8, 10)), advanceMonths: 1 as const, depositCentavos: rentCentavos };
}

/** One entry per bed: active and pending tenancies (a pending one holds its bed) oldest first, then null for each free bed. */
export function roomSpots(unit: Pick<RentalUnit, 'id' | 'capacity'>, tenancies: RentalTenancy[]): (RentalTenancy | null)[] {
  const living = tenancies.filter((t) => t.unitId === unit.id && t.moveOut === null)
    .sort((a, b) => a.moveIn.localeCompare(b.moveIn));
  return [...living, ...Array<null>(Math.max(unit.capacity - living.length, 0)).fill(null)];
}

/** Next date on or after `today` that rent falls due; a due day past the month's end means the last day. */
export function nextDueDate(dueDay: number, today: string): string {
  const [y, m, d] = today.split('-').map(Number);
  const due = (year: number, month: number) => Math.min(dueDay, new Date(Date.UTC(year, month, 0)).getUTCDate());
  const [year, month] = due(y, m) >= d ? [y, m] : m === 12 ? [y + 1, 1] : [y, m + 1];
  return `${year}-${String(month).padStart(2, '0')}-${String(due(year, month)).padStart(2, '0')}`;
}

/** A room's usual rent for a headcount: usual + extra × each person after the first; 0 when no usual rent is set. */
export function roomRent(unit: Pick<RentalUnit, 'defaultRentCentavos' | 'extraPersonRentCentavos'>, people: number): number {
  return unit.defaultRentCentavos ? unit.defaultRentCentavos + unit.extraPersonRentCentavos * Math.max(people - 1, 0) : 0;
}

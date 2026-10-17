import { centavosToInput, parsePesos, tenancyChargeSchema } from '@himan/shared/rentals';
import type { TenancyCharge } from '@himan/shared/rentals';

export type ChargeRow = { label: string; amount: string };

export const toChargeRows = (charges: TenancyCharge[]): ChargeRow[] => charges.map((c) => ({ label: c.label, amount: centavosToInput(c.amount) }));

/** Typed rows → charges; blank rows are dropped, half-filled ones throw a readable error. */
export function parseCharges(rows: ChargeRow[]): TenancyCharge[] {
  return rows.filter((r) => r.label.trim() || r.amount.trim()).map((r) => {
    if (!r.label.trim() || !r.amount.trim()) throw new Error('Enter a name and amount for each charge');
    const parsed = tenancyChargeSchema.safeParse({ label: r.label, amount: parsePesos(r.amount) });
    if (!parsed.success) throw new Error(parsed.error.issues[0].message);
    return parsed.data;
  });
}

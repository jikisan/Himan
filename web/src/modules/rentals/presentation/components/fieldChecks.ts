import { parsePesos, tenancyChargeSchema } from '@himan/shared/rentals';
import type { UnitInput } from '@himan/shared/rentals';
import type { ChargeRow } from '../utils/charges';
import type { UtilityState } from './UtilityFields';
import { errorMessage } from '../utils/errorMessage';

// Per-field checks for the shared editors (UtilityFields, ChargesEditor): [field id, message] pairs for useFieldErrors.failMany.

const priced = (mode: UnitInput['electricMode']) => mode === 'submeter' || mode === 'fixed';

/** The utility field a schema path (`electricAmountCentavos`, …) belongs to. */
export const utilityFieldId = (idPrefix: string, key: PropertyKey) =>
  key === 'electricAmountCentavos' ? `${idPrefix}-electric-amount` : key === 'waterAmountCentavos' ? `${idPrefix}-water-amount` : null;

/** The peso parser's message under each priced utility whose amount doesn't read; empty when both read. */
export function utilityErrors(idPrefix: string, { modes, amounts }: UtilityState): [string, string][] {
  return (['electric', 'water'] as const).flatMap((key): [string, string][] => {
    if (!priced(modes[key])) return [];
    try { parsePesos(amounts[key]); return []; } catch (e) { return [[`${idPrefix}-${key}-amount`, errorMessage(e)]]; }
  });
}

const HALF = 'Enter a name and amount for each charge';
/** `parseCharges`' checks, each under the field it is about (`${idPrefix}-charge-${i}-name|amount`); blank rows pass. */
export function chargeErrors(idPrefix: string, rows: ChargeRow[]): [string, string][] {
  return rows.flatMap((r, i): [string, string][] => {
    const id = (part: 'name' | 'amount') => `${idPrefix}-charge-${i}-${part}`;
    if (!r.label.trim() && !r.amount.trim()) return [];
    if (!r.label.trim()) return [[id('name'), HALF]];
    if (!r.amount.trim()) return [[id('amount'), HALF]];
    let amount;
    try { amount = parsePesos(r.amount); } catch (e) { return [[id('amount'), errorMessage(e)]]; }
    const parsed = tenancyChargeSchema.safeParse({ label: r.label, amount });
    return parsed.success ? [] : [[id(parsed.error.issues[0].path[0] === 'label' ? 'name' : 'amount'), parsed.error.issues[0].message]];
  });
}

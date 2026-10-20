import { finalBillLines, periodOf } from '../domain/index.js';
import type { BillingContext, MeterKind, MeterReading, PaymentInput, PropertyInput, ReadingInput, RenterInput, StartTenancyInput, TenancyCharge,
  UnitInput } from '../domain/index.js';
import type { IssueBillInput } from './BillRepository.js';
import type { TenancyRepository } from './TenancyRepository.js';

type MeterValue = { kind: MeterKind; value: number };
type SaveReadings = { saveReadings(propertyId: string, inputs: ReadingInput[]): Promise<MeterReading[]> };

type FileInput = { name: string; mimeType?: string | null; bytes: ArrayBuffer };

export interface MoveInInput {
  propertyId: string; unitId: string; moveIn: string;
  /** Existing tenant, or null to create `renter` in the same transaction. */
  renterId: string | null; renter: RenterInput | null;
  terms: Omit<StartTenancyInput, 'unitId' | 'renterId' | 'moveIn'>;
  /** Paid towards the move-in bill now; null = pay later. */
  payment: Omit<PaymentInput, 'billId'> | null;
  /** Payment screenshots, attached after the move-in. */
  proofs?: FileInput[];
  /** Optional starting meter readings, dated move-in. */
  readings?: MeterValue[];
  charges?: TenancyCharge[];
}

/** Creates the tenant (if new), the tenancy, its move-in bill and the payment in one transaction. Starting readings, extra charges
 * and proofs are saved afterwards; if one fails the move-in stays and a warning is returned. */
export async function moveIn(repos: {
  tenancies: { moveIn: TenancyRepository['moveIn']; setCharges(tenancyId: string, charges: TenancyCharge[]): Promise<void> };
  bills: SaveReadings;
  payments: { uploadProof(paymentId: string, propertyId: string, file: FileInput): Promise<void> };
}, a: MoveInInput): Promise<{ renterId: string; tenancyId: string; billId: string | null; paymentId: string | null; warnings: string[] }> {
  const ids = await repos.tenancies.moveIn({ unitId: a.unitId, renterId: a.renterId, renter: a.renter, moveIn: a.moveIn, ...a.terms, payment: a.payment });
  const warnings: string[] = [];
  if (a.readings?.length) {
    await repos.bills.saveReadings(a.propertyId, a.readings.map((r) => ({ unitId: a.unitId, kind: r.kind, readOn: a.moveIn,
      value: r.value, isReset: false }))).catch(() => { warnings.push('Moved in, but the starting readings weren’t saved'); });
  }
  if (a.charges?.length) {
    await repos.tenancies.setCharges(ids.tenancyId, a.charges).catch(() => { warnings.push('Moved in, but the extra charges weren’t saved'); });
  }
  const failed: string[] = [];
  if (ids.paymentId) for (const file of a.proofs ?? []) await repos.payments.uploadProof(ids.paymentId, a.propertyId, file).catch(() => { failed.push(file.name); });
  if (failed.length) warnings.push(`Couldn’t attach ${failed.join(', ')}. Add it again from the payment.`);
  return { ...ids, warnings };
}

/** Saves final readings, records the move-out, then issues a final bill for the leaver's unbilled usage. */
export async function moveOut(repos: {
  tenancies: { end(id: string, moveOut: string): Promise<void> };
  bills: SaveReadings & { issue(input: IssueBillInput): Promise<string> };
}, a: { ctx: BillingContext; tenancyId: string; moveOut: string; readings: MeterValue[] }): Promise<{ warnings: string[]; finalBillId: string | null }> {
  const tenancy = a.ctx.tenancies.find((t) => t.id === a.tenancyId);
  if (!tenancy) throw new Error('Tenant not found');
  const saved = a.readings.length ? await repos.bills.saveReadings(a.ctx.property.id, a.readings.map((r) => ({ unitId: tenancy.unitId,
    kind: r.kind, readOn: a.moveOut, value: r.value, isReset: false }))) : [];
  await repos.tenancies.end(a.tenancyId, a.moveOut);
  const lines = finalBillLines({ ...a.ctx, readings: [...a.ctx.readings, ...saved] }, a.tenancyId, a.moveOut);
  if (!lines.length) return { warnings: [], finalBillId: null };
  try {
    const finalBillId = await repos.bills.issue({ tenancyId: a.tenancyId, kind: 'final', period: periodOf(a.moveOut), dueOn: a.moveOut, lines });
    return { warnings: [], finalBillId };
  } catch {
    return { warnings: ['Moved out, but the final bill wasn’t made. Make it from Bills.'], finalBillId: null };
  }
}

/** Issues bills one by one; the ones that fail are returned by tenancy id instead of stopping the rest. */
export async function issueBills(repos: { bills: { issue(input: IssueBillInput): Promise<string> } },
  inputs: IssueBillInput[]): Promise<{ issued: number; failed: string[] }> {
  const failed: string[] = [];
  for (const input of inputs) await repos.bills.issue(input).catch(() => { failed.push(input.tenancyId); });
  return { issued: inputs.length - failed.length, failed };
}

/** Saves a new property and its rooms; a room that fails is reported by name instead of stopping the rest. */
export async function setupProperty(repos: {
  properties: { save(id: null, input: PropertyInput): Promise<string>; saveUnit(propertyId: string, id: null, input: UnitInput): Promise<void> };
}, a: { input: PropertyInput; rooms: UnitInput[] }): Promise<{ propertyId: string; failed: string[] }> {
  const propertyId = await repos.properties.save(null, a.input);
  const failed: string[] = [];
  for (const room of a.rooms) await repos.properties.saveUnit(propertyId, null, room).catch(() => { failed.push(room.name); });
  return { propertyId, failed };
}

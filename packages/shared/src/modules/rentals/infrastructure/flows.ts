import { finalBillLines, periodOf } from '../domain/index.js';
import type { BillingContext, MeterKind, MeterReading, PropertyInput, ReadingInput, RenterInput, StartTenancyInput, TenancyCharge,
  UnitInput } from '../domain/index.js';
import type { IssueBillInput } from './BillRepository.js';

type MeterValue = { kind: MeterKind; value: number };
type SaveReadings = { saveReadings(propertyId: string, inputs: ReadingInput[]): Promise<MeterReading[]> };

export interface AddTenantInput {
  propertyId: string; unitId: string; moveIn: string;
  /** Existing tenant, or null to create `renter` first. */
  renterId: string | null; renter: RenterInput | null;
  terms: Omit<StartTenancyInput, 'unitId' | 'renterId' | 'moveIn'>;
  /** Optional starting meter readings, dated move-in. */
  readings?: MeterValue[];
  charges?: TenancyCharge[];
}

/** Creates the tenant (if new) and moves them in; a failed move-in removes the just-created tenant.
 * Starting readings and extra charges are saved afterwards; if they fail the move-in stays and a warning is returned. */
export async function addTenant(repos: {
  renters: { save(propertyId: string, id: null, input: RenterInput): Promise<string>; remove(id: string): Promise<void> };
  tenancies: { start(input: StartTenancyInput): Promise<string>; setCharges?(tenancyId: string, charges: TenancyCharge[]): Promise<void> };
  bills?: SaveReadings;
}, a: AddTenantInput): Promise<{ renterId: string; tenancyId: string; warnings: string[] }> {
  if (!a.renterId && !a.renter) throw new Error('Enter the tenant’s details');
  const renterId = a.renterId ?? await repos.renters.save(a.propertyId, null, a.renter!);
  let tenancyId: string;
  try {
    tenancyId = await repos.tenancies.start({ unitId: a.unitId, renterId, moveIn: a.moveIn, ...a.terms });
  } catch (error) {
    if (!a.renterId) await repos.renters.remove(renterId).catch(() => undefined);
    throw error;
  }
  const warnings: string[] = [];
  if (a.readings?.length && repos.bills) {
    await repos.bills.saveReadings(a.propertyId, a.readings.map((r) => ({ unitId: a.unitId, kind: r.kind, readOn: a.moveIn,
      value: r.value, isReset: false }))).catch(() => { warnings.push('Moved in, but the starting readings weren’t saved'); });
  }
  if (a.charges?.length && repos.tenancies.setCharges) {
    await repos.tenancies.setCharges(tenancyId, a.charges).catch(() => { warnings.push('Moved in, but the extra charges weren’t saved'); });
  }
  return { renterId, tenancyId, warnings };
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

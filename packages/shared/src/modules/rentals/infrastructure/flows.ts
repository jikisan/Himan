import type { PropertyInput, RenterInput, StartTenancyInput, UnitInput } from '../domain/index.js';

export interface AddTenantInput {
  propertyId: string; unitId: string; moveIn: string;
  /** Existing tenant, or null to create `renter` first. */
  renterId: string | null; renter: RenterInput | null;
  terms: Omit<StartTenancyInput, 'unitId' | 'renterId' | 'moveIn'>;
}

/** Creates the tenant (if new) and moves them in; a failed move-in removes the just-created tenant. */
export async function addTenant(repos: {
  renters: { save(propertyId: string, id: null, input: RenterInput): Promise<string>; remove(id: string): Promise<void> };
  tenancies: { start(input: StartTenancyInput): Promise<string> };
}, a: AddTenantInput): Promise<string> {
  if (!a.renterId && !a.renter) throw new Error('Enter the tenant’s details');
  const renterId = a.renterId ?? await repos.renters.save(a.propertyId, null, a.renter!);
  try {
    await repos.tenancies.start({ unitId: a.unitId, renterId, moveIn: a.moveIn, ...a.terms });
  } catch (error) {
    if (!a.renterId) await repos.renters.remove(renterId).catch(() => undefined);
    throw error;
  }
  return renterId;
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

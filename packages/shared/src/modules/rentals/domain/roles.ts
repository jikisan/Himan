export const RENTAL_ROLES = ['viewer', 'manager', 'owner'] as const;
export type RentalRole = (typeof RENTAL_ROLES)[number];

export function hasRentalRole(role: RentalRole | null | undefined, min: RentalRole): boolean {
  return !!role && RENTAL_ROLES.indexOf(role) >= RENTAL_ROLES.indexOf(min);
}

export function unitOccupancy(unit: { id: string; capacity: number },
  tenancies: { unitId: string; moveOut: string | null }[]) {
  const occupied = tenancies.filter((t) => t.unitId === unit.id && t.moveOut === null).length;
  return { occupied, capacity: unit.capacity, free: Math.max(unit.capacity - occupied, 0) };
}

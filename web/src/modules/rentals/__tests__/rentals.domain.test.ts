import { describe, expect, it } from 'vitest';
import { parsePesos, formatPesos, centavosToInput, manilaToday, hasRentalRole, unitOccupancy,
  unitSchema, startTenancySchema, renterSchema, validateRentalFile, RENTAL_FILE_LIMIT,
  moveInDefaults, roomSpots, contractTermsSchema, nextDueDate, roomRent } from '@himan/shared/rentals';
import type { RentalTenancy, RentalUnit } from '@himan/shared/rentals';

const unit = { name: 'Room A', kind: 'bedspace' as const, capacity: 2, electricMode: 'submeter' as const,
  electricAmountCentavos: 1250, waterMode: 'fixed' as const, waterAmountCentavos: 20000 };
const tenancy = { unitId: '00000000-0000-0000-0000-000000000001', renterId: '00000000-0000-0000-0000-000000000002',
  moveIn: '2026-10-01', startDate: '2026-10-01', endDate: '2027-10-01', monthlyRentCentavos: 1000000,
  dueDay: 30, advanceMonths: 1, depositCentavos: 1000000 };

describe('pesos', () => {
  it('parses amounts the way people type them', () => {
    expect(parsePesos('10,000')).toBe(1000000);
    expect(parsePesos('₱ 1,500.5')).toBe(150050);
    expect(parsePesos(' 250 ')).toBe(25000);
    expect(parsePesos('0.05')).toBe(5);
  });
  it('rejects anything that is not a non-negative amount with at most two decimals', () => {
    for (const bad of ['abc', '-5', '1.005', '', '1,2,3.4.5']) {
      expect(() => parsePesos(bad)).toThrow('Enter an amount like 10,000 or 1,500.50');
    }
    expect(() => parsePesos('20,000,001')).toThrow('Amount is too large');
  });
  it('formats centavos as Philippine pesos and back to an editable value', () => {
    expect(formatPesos(1000000)).toBe('₱10,000.00');
    expect(centavosToInput(150050)).toBe('1500.50');
    expect(centavosToInput(0)).toBe('');
  });
  it('uses the Manila calendar day', () => {
    expect(manilaToday(new Date('2026-10-15T17:30:00Z'))).toBe('2026-10-16');
  });
});

describe('roles and occupancy', () => {
  it('ranks viewer below manager below owner', () => {
    expect(hasRentalRole('owner', 'manager')).toBe(true);
    expect(hasRentalRole('viewer', 'manager')).toBe(false);
    expect(hasRentalRole(null, 'viewer')).toBe(false);
  });
  it('counts only active tenancies of the unit', () => {
    const tenancies = [{ unitId: 'u', moveOut: null }, { unitId: 'u', moveOut: '2026-01-01' }, { unitId: 'x', moveOut: null }];
    expect(unitOccupancy({ id: 'u', capacity: 2 }, tenancies)).toEqual({ occupied: 1, capacity: 2, free: 1 });
  });
});

describe('schemas', () => {
  it('allows capacity above one only for bedspace', () => {
    expect(unitSchema.safeParse(unit).success).toBe(true);
    expect(unitSchema.safeParse({ ...unit, kind: 'room' }).success).toBe(false);
  });
  it('requires an amount exactly when a utility is billed', () => {
    expect(unitSchema.safeParse({ ...unit, electricAmountCentavos: 0 }).success).toBe(false);
    expect(unitSchema.safeParse({ ...unit, waterMode: 'none' }).success).toBe(false);
    expect(unitSchema.safeParse({ ...unit, waterMode: 'none', waterAmountCentavos: 0 }).success).toBe(true);
  });
  it('rejects a contract that ends before it starts or a due day outside 1–31', () => {
    expect(startTenancySchema.safeParse(tenancy).success).toBe(true);
    expect(startTenancySchema.safeParse({ ...tenancy, endDate: '2026-10-01' }).success).toBe(false);
    expect(startTenancySchema.safeParse({ ...tenancy, dueDay: 32 }).success).toBe(false);
    expect(startTenancySchema.safeParse({ ...tenancy, monthlyRentCentavos: 0 }).success).toBe(false);
  });
  it('accepts a renter with only a name and rejects a malformed email', () => {
    const renter = { fullName: 'Juan Dela Cruz', phone: '', facebook: '', email: '', address: '',
      emergencyName: '', emergencyPhone: '', occupants: 1, notes: '' };
    expect(renterSchema.safeParse(renter).success).toBe(true);
    expect(renterSchema.safeParse({ ...renter, email: 'not-an-email' }).success).toBe(false);
  });
  it('limits renter files to PDF, JPEG, PNG up to 10 MB', () => {
    expect(validateRentalFile('id.PNG', '', RENTAL_FILE_LIMIT)).toBe('image/png');
    expect(() => validateRentalFile('id.html', 'text/html', 10)).toThrow('PDF, JPEG, or PNG');
    expect(() => validateRentalFile('id.pdf', 'application/pdf', RENTAL_FILE_LIMIT + 1)).toThrow('10 MB');
  });
});

describe('rentals flow helpers', () => {
  const room = { id: 'u', propertyId: 'p', name: 'Room A', kind: 'bedspace', capacity: 4, electricMode: 'none',
    electricAmountCentavos: 0, waterMode: 'none', waterAmountCentavos: 0, defaultRentCentavos: 0, extraPersonRentCentavos: 0 } as RentalUnit;
  const t = (id: string, moveIn: string, unitId = 'u'): RentalTenancy =>
    ({ id, propertyId: 'p', unitId, renterId: `r-${id}`, moveIn, moveOut: null, contracts: [] });

  it('defaults a move-in to a one-year contract due on the move-in day', () => {
    expect(moveInDefaults('2026-10-31', 1000000)).toEqual({ startDate: '2026-10-31', endDate: '2027-10-31',
      dueDay: 31, advanceMonths: 1, depositCentavos: 1000000 });
  });
  it('ends a Feb 29 move-in on Feb 28 next year', () => {
    expect(moveInDefaults('2028-02-29', 500000).endDate).toBe('2029-02-28');
  });
  it('lists filled beds oldest first, then empty ones, ignoring past and other rooms', () => {
    const spots = roomSpots(room, [t('b', '2026-02-01'), t('a', '2026-01-01'), { ...t('x', '2025-01-01'), moveOut: '2025-12-01' },
      t('y', '2026-01-01', 'other')]);
    expect(spots.map((s) => s?.id ?? null)).toEqual(['a', 'b', null, null]);
  });
  it('finds the next due date, clamping to month end and rolling into next year', () => {
    expect(nextDueDate(20, '2026-10-16')).toBe('2026-10-20');
    expect(nextDueDate(16, '2026-10-16')).toBe('2026-10-16');
    expect(nextDueDate(5, '2026-10-16')).toBe('2026-11-05');
    expect(nextDueDate(31, '2027-02-10')).toBe('2027-02-28');
    expect(nextDueDate(3, '2026-12-20')).toBe('2027-01-03');
  });
  it('adds the extra-person rent for each person after the first', () => {
    const priced = { defaultRentCentavos: 300000, extraPersonRentCentavos: 50000 };
    expect(roomRent(priced, 1)).toBe(300000);
    expect(roomRent(priced, 2)).toBe(350000);
    expect(roomRent(priced, 3)).toBe(400000);
    expect(roomRent({ defaultRentCentavos: 0, extraPersonRentCentavos: 50000 }, 2)).toBe(0);
  });
  it('rejects due day 0 and 32 with a readable message', () => {
    const zero = contractTermsSchema.safeParse({ advanceMonths: 1, depositCentavos: 0, monthlyRentCentavos: 1, dueDay: 0 });
    expect(zero.success).toBe(false);
    expect(zero.error?.issues[0].message).toBe('Due day is 1–31');
    expect(contractTermsSchema.safeParse({ advanceMonths: 1, depositCentavos: 0, monthlyRentCentavos: 1, dueDay: 32 }).success).toBe(false);
    expect(contractTermsSchema.safeParse({ advanceMonths: 1, depositCentavos: 0, monthlyRentCentavos: 1, dueDay: 31 }).success).toBe(true);
  });
});

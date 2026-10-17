import { describe, expect, it, vi } from 'vitest';
import { addTenant, setupProperty } from '@himan/shared/rentals';
import type { PropertyInput, RenterInput, UnitInput } from '@himan/shared/rentals';

const person: RenterInput = { fullName: 'Juan', phone: '0917', facebook: '', email: '', address: '', emergencyName: '',
  emergencyPhone: '', occupants: 1, notes: '' };
const terms = { startDate: '2026-10-01', endDate: '2027-10-01', monthlyRentCentavos: 500000, dueDay: 1,
  advanceMonths: 1, depositCentavos: 500000 };
const repos = () => ({
  renters: { save: vi.fn(async () => 'new-renter'), remove: vi.fn(async () => undefined) },
  tenancies: { start: vi.fn(async () => 't') },
  properties: { save: vi.fn(async () => 'p'), saveUnit: vi.fn(async () => undefined) },
});

describe('addTenant', () => {
  it('creates the person, then moves them in', async () => {
    const r = repos();
    const id = await addTenant(r, { propertyId: 'p', unitId: 'u', renterId: null, renter: person, moveIn: '2026-10-01', terms });
    expect(id).toBe('new-renter');
    expect(r.tenancies.start).toHaveBeenCalledWith({ unitId: 'u', renterId: 'new-renter', moveIn: '2026-10-01', ...terms });
  });
  it('removes the new person again when the move-in fails, and keeps the original error', async () => {
    const r = repos();
    r.tenancies.start.mockRejectedValueOnce(new Error('This unit is full'));
    await expect(addTenant(r, { propertyId: 'p', unitId: 'u', renterId: null, renter: person, moveIn: '2026-10-01', terms }))
      .rejects.toThrow('This unit is full');
    expect(r.renters.remove).toHaveBeenCalledWith('new-renter');
  });
  it('never creates or removes an existing tenant', async () => {
    const r = repos();
    r.tenancies.start.mockRejectedValueOnce(new Error('full'));
    await expect(addTenant(r, { propertyId: 'p', unitId: 'u', renterId: 'old', renter: null, moveIn: '2026-10-01', terms })).rejects.toThrow();
    expect(r.renters.save).not.toHaveBeenCalled();
    expect(r.renters.remove).not.toHaveBeenCalled();
  });
});

describe('setupProperty', () => {
  const room = (name: string): UnitInput => ({ name, kind: 'room', capacity: 1, electricMode: 'none', electricAmountCentavos: 0,
    waterMode: 'none', waterAmountCentavos: 0, defaultRentCentavos: 0, extraPersonRentCentavos: 0 });
  it('saves every room and reports the ones that failed by name', async () => {
    const r = repos();
    r.properties.saveUnit.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('x')).mockResolvedValueOnce(undefined);
    const result = await setupProperty(r, { input: { name: 'House' } as PropertyInput, rooms: [room('A'), room('B'), room('C')] });
    expect(result).toEqual({ propertyId: 'p', failed: ['B'] });
    expect(r.properties.saveUnit).toHaveBeenCalledTimes(3);
  });
});

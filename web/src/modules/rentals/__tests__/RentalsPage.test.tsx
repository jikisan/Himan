import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { RentalProperty } from '@himan/shared/rentals';
import type { Renter } from '@himan/shared/rentals';
import type { RentalTenancy } from '@himan/shared/rentals';
import { RentalsPage } from '../presentation/pages/RentalsPage';

const property: RentalProperty = {
  id: 'p', createdBy: 'owner', name: 'Bakilid House', address: '', ownerName: '', ownerAddress: '',
  lessorName: 'Owner', lessorCivilStatus: '', lessorAddress: '', lessorCapacity: 'owner', signingCity: '',
  invoicePrefix: 'INV', archivedAt: null, createdAt: '', updatedAt: '', role: 'owner',
  units: [{ id: 'u1', propertyId: 'p', name: 'Room A', kind: 'bedspace', capacity: 2, electricMode: 'none',
    electricAmountCentavos: 0, waterMode: 'none', waterAmountCentavos: 0 }],
};
const state = vi.hoisted(() => ({
  properties: [] as RentalProperty[], renters: [] as unknown[], tenancies: [] as unknown[],
  online: true, userId: 'owner', myName: 'Maria Santos', loading: false, error: null, busy: false,
  run: vi.fn(), refetch: vi.fn(), fileUrl: vi.fn(), listMembers: vi.fn(async () => []), listFriends: vi.fn(async () => []),
}));
vi.mock('../presentation/hooks/useRentals', () => ({ useRentals: () => state }));

beforeEach(() => { vi.clearAllMocks(); state.myName = 'Maria Santos'; state.properties = [property]; state.renters = []; state.tenancies = []; });
const page = () => render(<MemoryRouter><RentalsPage /></MemoryRouter>);

describe('Rentals page — properties and units', () => {
  it('shows unit occupancy for the selected property', () => {
    page();
    expect(screen.getByText('Room A')).toBeInTheDocument();
    expect(screen.getAllByText('0 / 2 occupied').length).toBeGreaterThan(0);
  });
  it('hides owner-only controls from a viewer', () => {
    state.properties = [{ ...property, role: 'viewer' }];
    page();
    expect(screen.queryByRole('button', { name: 'Add unit' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Share' })).not.toBeInTheDocument();
  });
  it('keeps the unit form open with a readable error when the rate is not a peso amount', async () => {
    page();
    fireEvent.click(screen.getByRole('button', { name: 'Add unit' }));
    fireEvent.change(screen.getByLabelText('Unit name'), { target: { value: 'Room B' } });
    fireEvent.change(screen.getByLabelText('Electricity'), { target: { value: 'submeter' } });
    fireEvent.change(screen.getByLabelText('Electricity rate per kWh'), { target: { value: 'twelve' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save unit' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter an amount like 10,000 or 1,500.50');
    expect(state.run).not.toHaveBeenCalled();
  });
  it('saves a unit in centavos', async () => {
    state.run.mockResolvedValue(undefined);
    page();
    fireEvent.click(screen.getByRole('button', { name: 'Add unit' }));
    fireEvent.change(screen.getByLabelText('Unit name'), { target: { value: 'Room B' } });
    fireEvent.change(screen.getByLabelText('Electricity'), { target: { value: 'submeter' } });
    fireEvent.change(screen.getByLabelText('Electricity rate per kWh'), { target: { value: '12.50' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save unit' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'saveUnit', propertyId: 'p', id: null,
      input: expect.objectContaining({ name: 'Room B', electricMode: 'submeter', electricAmountCentavos: 1250 }) }));
  });
});


const renter: Renter = { id: 'r1', propertyId: 'p', fullName: 'Juan Dela Cruz', phone: '0917', facebook: '', email: '',
  address: '', emergencyName: '', emergencyPhone: '', occupants: 1, notes: '',
  files: [{ id: 'f1', renterId: 'r1', propertyId: 'p', name: 'national-id.png', mimeType: 'image/png', size: 10, storagePath: 'p/renters/r1/f1', ready: true }] };

describe('Rentals page — renters', () => {
  it('lists only renters of the selected property', () => {
    state.renters = [renter, { ...renter, id: 'r2', propertyId: 'other', fullName: 'Other Person' }];
    page();
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Renters' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Renters' }));
    expect(screen.getByText('Juan Dela Cruz')).toBeInTheDocument();
    expect(screen.queryByText('Other Person')).not.toBeInTheDocument();
  });
  it('asks before deleting a renter', async () => {
    state.renters = [renter]; state.run.mockResolvedValue(undefined);
    page();
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Renters' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Renters' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open Juan Dela Cruz' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete renter' }));
    expect(state.run).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'removeRenter', id: 'r1' }));
  });
  it('never shows the ID files section to a viewer', () => {
    state.properties = [{ ...property, role: 'viewer' }];
    state.renters = [renter];
    page();
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Renters' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Renters' }));
    fireEvent.click(screen.getByRole('button', { name: 'Open Juan Dela Cruz' }));
    expect(screen.queryByText('Valid ID')).not.toBeInTheDocument();
    expect(screen.queryByText('national-id.png')).not.toBeInTheDocument();
  });
});


const fullRoom = { id: 'u2', propertyId: 'p', name: 'Room B', kind: 'room' as const, capacity: 1, electricMode: 'none' as const,
  electricAmountCentavos: 0, waterMode: 'none' as const, waterAmountCentavos: 0 };
const active: RentalTenancy = { id: 't1', propertyId: 'p', unitId: 'u2', renterId: 'r1', moveIn: '2026-10-01', moveOut: null,
  contracts: [{ id: 'c1', tenancyId: 't1', startDate: '2026-10-01', endDate: '2027-10-01', monthlyRentCentavos: 1000000,
    dueDay: 30, advanceMonths: 1, depositCentavos: 1000000, status: 'active' }] };

describe('Rentals page — tenancies and sharing', () => {
  const openTab = () => { fireEvent.mouseDown(screen.getByRole('tab', { name: 'Tenancies' })); fireEvent.click(screen.getByRole('tab', { name: 'Tenancies' })); };
  it('offers only units with a free slot when starting a tenancy', () => {
    state.properties = [{ ...property, units: [...property.units, fullRoom] }];
    state.renters = [renter]; state.tenancies = [active];
    page(); openTab();
    fireEvent.click(screen.getByRole('button', { name: 'Start tenancy' }));
    const options = [...(screen.getByLabelText('Unit') as HTMLSelectElement).options].map((o) => o.text);
    expect(options).toContain('Room A (2 free)');
    expect(options.some((o) => o.startsWith('Room B'))).toBe(false);
  });
  it('shows the active tenancy with its rent and due day', () => {
    state.properties = [{ ...property, units: [...property.units, fullRoom] }];
    state.renters = [renter]; state.tenancies = [active];
    page(); openTab();
    expect(screen.getByText('Juan Dela Cruz · Room B')).toBeInTheDocument();
    expect(screen.getByText(/₱10,000.00\/mo · due day 30/)).toBeInTheDocument();
  });
  it('asks before ending a tenancy and only ends it after confirming', async () => {
    state.properties = [{ ...property, units: [...property.units, fullRoom] }];
    state.renters = [renter]; state.tenancies = [active]; state.run.mockResolvedValue(undefined);
    page(); openTab();
    fireEvent.click(screen.getByRole('button', { name: 'End today' }));
    expect(state.run).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: 'End tenancy' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith(expect.objectContaining({ type: 'endTenancy', id: 't1' })));
  });
  it('lets the owner open sharing and hides it from managers', () => {
    page();
    expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument();
    state.properties = [{ ...property, role: 'manager' }];
    page();
    expect(screen.getAllByRole('button', { name: 'Share' })).toHaveLength(1);
  });
});


describe('Rentals page — property owner and lessor', () => {
  const openNew = () => { page(); fireEvent.click(screen.getByRole('button', { name: 'New property' })); };
  it('fills owner and lessor with my profile name by default', async () => {
    state.run.mockResolvedValue(undefined);
    openNew();
    expect(screen.getByLabelText('Owner name')).toHaveValue('Maria Santos');
    expect(screen.getByLabelText('Owner name')).toHaveAttribute('readonly');
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Bakilid House 2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save property' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'saveProperty', id: null,
      input: expect.objectContaining({ ownerName: 'Maria Santos', lessorName: 'Maria Santos' }) }));
  });
  it('lets me type a different lessor after unticking', async () => {
    state.run.mockResolvedValue(undefined);
    openNew();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Use my name as lessor name' }));
    fireEvent.change(screen.getByLabelText('Lessor name'), { target: { value: 'Pedro Reyes' } });
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Bakilid House 2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save property' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith(expect.objectContaining({
      input: expect.objectContaining({ ownerName: 'Maria Santos', lessorName: 'Pedro Reyes' }) })));
  });
  it('disables the shortcut when my profile has no name', () => {
    state.myName = '';
    openNew();
    expect(screen.getByRole('checkbox', { name: 'Use my name as owner name' })).toBeDisabled();
    expect(screen.getByLabelText('Owner name')).not.toHaveAttribute('readonly');
  });
  it('asks before deleting a unit', async () => {
    state.run.mockResolvedValue(undefined);
    page();
    fireEvent.click(screen.getByRole('button', { name: 'Delete Room A' }));
    expect(state.run).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: 'Delete unit' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'removeUnit', id: 'u1' }));
  });
});

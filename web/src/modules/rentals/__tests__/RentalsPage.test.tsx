import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { RentalProperty } from '@himan/shared/rentals';
import type { Renter } from '@himan/shared/rentals';
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
  online: true, userId: 'owner', loading: false, error: null, busy: false,
  run: vi.fn(), refetch: vi.fn(), fileUrl: vi.fn(), listMembers: vi.fn(async () => []), listFriends: vi.fn(async () => []),
}));
vi.mock('../presentation/hooks/useRentals', () => ({ useRentals: () => state }));

beforeEach(() => { vi.clearAllMocks(); state.properties = [property]; state.renters = []; state.tenancies = []; });
const page = () => render(<MemoryRouter><RentalsPage /></MemoryRouter>);

describe('Rentals page — properties and units', () => {
  it('shows unit occupancy for the selected property', () => {
    page();
    expect(screen.getByText('Room A')).toBeInTheDocument();
    expect(screen.getByText('0 / 2 occupied')).toBeInTheDocument();
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

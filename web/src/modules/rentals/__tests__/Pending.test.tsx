import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DEFAULT_CLAUSES } from '@himan/shared/rentals';
import type { Clause, ContractText, PropertyInput, RentalBill, RentalProperty, RentalTenancy, Renter, TenancyLink } from '@himan/shared/rentals';
import { RentalsPage } from '../presentation/pages/RentalsPage';
import { PropertyForm } from '../presentation/components/PropertyForm';

vi.mock('signature_pad', () => ({
  default: class { addEventListener() {} toDataURL() { return ''; } clear() {} off() {} on() {} toData() { return []; } fromData() {} },
}));

const property: RentalProperty = {
  id: 'p', createdBy: 'owner', name: 'Bakilid House', address: 'Mandaue', ownerName: '', ownerAddress: '', lessorName: 'Maria Santos',
  lessorCivilStatus: '', lessorAddress: '', lessorCapacity: 'owner', signingCity: '', invoicePrefix: 'INV', lateFeeCentavos: 0, rentDueDay: null,
  paymentsTrackedFrom: null, requireContract: true, archivedAt: null, createdAt: '', updatedAt: '', role: 'owner',
  units: [{ id: 'u', propertyId: 'p', name: 'Room A', kind: 'bedspace', capacity: 2, electricMode: 'none', electricAmountCentavos: 0,
    waterMode: 'none', waterAmountCentavos: 0, defaultRentCentavos: 300000, extraPersonRentCentavos: 0 }],
};
const renter = (id: string, fullName: string): Renter => ({ id, propertyId: 'p', fullName, phone: '0917', facebook: '', email: '', address: '',
  emergencyName: '', emergencyPhone: '', occupants: 1, notes: '', files: [] });
const tenancy = (id: string, renterId: string, pending: boolean): RentalTenancy => ({ id, propertyId: 'p', unitId: 'u', renterId,
  moveIn: '2026-10-01', moveOut: null, pending, charges: [],
  contracts: [{ id: `c-${id}`, tenancyId: id, startDate: '2026-10-01', endDate: '2027-10-01', monthlyRentCentavos: 300000, dueDay: 1,
    advanceMonths: 1, depositCentavos: 300000, status: 'active' }] });
const text = (extra: Partial<ContractText>): ContractText => ({ id: 'ct', propertyId: 'p', contractId: 'c-tp', body: ['1. Rent.'], specialTerms: '',
  status: 'draft', signMode: 'esign', contentHash: null, tenantName: null, tenantSignature: null, tenantSignedAt: null, lessorSignedAt: null,
  lessorSignature: null, notarizedScanPath: null, createdAt: '', updatedAt: '', ...extra });

const state = vi.hoisted(() => ({
  properties: [] as RentalProperty[], renters: [] as Renter[], tenancies: [] as RentalTenancy[], pendingTenancies: [] as RentalTenancy[],
  bills: [] as RentalBill[], readings: [], utilityBills: [], payments: [], accounts: [], settlements: [], contractTexts: [] as ContractText[],
  links: [] as TenancyLink[], templates: {} as Record<string, Clause[]>, online: true, userId: 'owner', myName: 'Maria Santos', loading: false,
  error: null, busy: false, run: vi.fn(), refetch: vi.fn(), fileUrl: vi.fn(), listMembers: vi.fn(async () => []), listFriends: vi.fn(async () => []),
}));
vi.mock('../presentation/hooks/useRentals', () => ({ useRentals: () => state }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-10T02:00:00Z'));
  state.properties = [property];
  state.renters = [renter('ra', 'Ana Reyes'), renter('rp', 'Pia Cruz')];
  state.tenancies = [tenancy('ta', 'ra', false)];
  state.pendingTenancies = [tenancy('tp', 'rp', true)];
  state.contractTexts = [];
  state.templates = { p: DEFAULT_CLAUSES };
  state.run.mockResolvedValue(undefined);
});

const page = () => render(<MemoryRouter><RentalsPage /></MemoryRouter>);
const room = () => within(screen.getByRole('region', { name: 'Room A' }));

describe('Pending tenants', () => {
  it('hold their bed on the Rooms board, labelled Pending, with Cancel instead of Move out', async () => {
    page();
    fireEvent.click(screen.getByRole('button', { name: 'Rooms' }));
    expect(room().getByText('Full')).toBeInTheDocument();
    expect(room().getByText('Pending · Pia Cruz')).toBeInTheDocument();
    expect(room().queryByRole('button', { name: 'Move out Pia Cruz' })).toBeNull();
    fireEvent.click(room().getByRole('button', { name: 'Cancel Pia Cruz' }));
    expect(screen.getByText('Cancel this pending tenant? The bed becomes free.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel tenant' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'endTenancy', id: 'tp', moveOut: '2026-10-10' }));
  });

  it('show as Pending contract in the Tenants list', () => {
    page();
    fireEvent.click(screen.getByRole('button', { name: 'Tenants' }));
    expect(within(screen.getByRole('button', { name: /Pia Cruz/ })).getByText('Pending contract')).toBeInTheDocument();
  });

  it('count as a taken bed on Home but not in monthly rent', () => {
    page();
    const glance = within(screen.getByRole('region', { name: 'At a glance' }));
    expect(glance.getByText('Beds taken').nextSibling).toHaveTextContent('2 of 2');
    expect(glance.getByText('Monthly rent').nextSibling).toHaveTextContent('₱3,000.00');
    expect(screen.queryByText(/free bed/)).toBeNull();
  });

  it('show a waiting to-do, and the countersign to-do says it makes them active', () => {
    state.contractTexts = [text({ status: 'sent' })];
    const { unmount } = page();
    expect(screen.getByText('Waiting for Pia Cruz to sign')).toBeInTheDocument();
    unmount();
    state.contractTexts = [text({ status: 'signed' })];
    page();
    expect(screen.getByText('Countersign contract for Pia Cruz')).toBeInTheDocument();
    expect(screen.getByText(/Countersigning makes them an active tenant\./)).toBeInTheDocument();
  });

  it('get a sheet with the contract first and no rent, money or move-out', () => {
    page();
    fireEvent.click(screen.getByRole('button', { name: 'Rooms' }));
    fireEvent.click(room().getByRole('button', { name: /Pending · Pia Cruz/ }));
    expect(screen.getByText(/become an active tenant once they sign and you countersign/)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Rent' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Money received' })).toBeNull();
    expect(screen.queryByRole('button', { name: /Move Pia Cruz out/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Create contract' })).toBeInTheDocument();
  });

  it('can be made active once the contract is signed by both', async () => {
    state.contractTexts = [text({ status: 'countersigned' })];
    page();
    fireEvent.click(screen.getByRole('button', { name: 'Rooms' }));
    fireEvent.click(room().getByRole('button', { name: /Pending · Pia Cruz/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Make active tenant' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'activateTenancy', tenancyId: 'tp' }));
  });
});

describe('Add tenant when the property requires a contract', () => {
  it('asks how the contract is signed, saves them pending, then opens their sheet with the choice prefilled', async () => {
    state.pendingTenancies = [];
    state.run.mockImplementation(async () => {
      state.renters = [...state.renters, renter('rn', 'Elle Tan')];
      state.pendingTenancies = [tenancy('tn', 'rn', true)];
      return { renterId: 'rn', tenancyId: 'tn', warnings: [] };
    });
    const { rerender } = page();
    fireEvent.click(screen.getByRole('button', { name: 'Rooms' }));
    fireEvent.click(room().getByRole('button', { name: /Add tenant/ }));
    expect(screen.getByText('This tenant will be Pending until the contract is signed.')).toBeInTheDocument();
    const mode = within(screen.getByRole('group', { name: 'How is the contract signed?' }));
    expect(mode.getByRole('radio', { name: /Sign online only/ })).toBeChecked();
    fireEvent.click(mode.getByRole('radio', { name: /Sign online, then notarize/ }));
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Elle Tan' } });
    fireEvent.change(screen.getByLabelText('Mobile number'), { target: { value: '0918' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save as pending' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith(expect.objectContaining({ type: 'addTenant', pending: true })));
    rerender(<MemoryRouter><RentalsPage /></MemoryRouter>); // the refetch after saving
    fireEvent.click(await screen.findByRole('button', { name: 'Create contract' }));
    expect(within(screen.getByRole('group', { name: 'How is the contract signed?' })).getByRole('radio', { name: /then notarize/ })).toBeChecked();
  });

  it('is unchanged when the property does not require one', async () => {
    state.properties = [{ ...property, requireContract: false }];
    state.pendingTenancies = [];
    state.run.mockResolvedValue({ renterId: 'rn', tenancyId: 'tn', warnings: [] });
    page();
    fireEvent.click(screen.getByRole('button', { name: 'Rooms' }));
    fireEvent.click(room().getByRole('button', { name: /Add tenant/ }));
    expect(screen.queryByRole('group', { name: 'How is the contract signed?' })).toBeNull();
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Elle Tan' } });
    fireEvent.change(screen.getByLabelText('Mobile number'), { target: { value: '0918' } });
    fireEvent.click(screen.getByRole('button', { name: 'Move in' }));
    await waitFor(() => expect(state.run).toHaveBeenCalled());
    expect(state.run.mock.calls[0][0]).not.toHaveProperty('pending', true);
  });
});

describe('Contract sign mode', () => {
  const sheet = () => {
    page();
    fireEvent.click(screen.getByRole('button', { name: 'Rooms' }));
    fireEvent.click(room().getByRole('button', { name: /Pending · Pia Cruz/ }));
  };
  it('is chosen on the draft and saved with it', async () => {
    sheet();
    fireEvent.click(screen.getByRole('button', { name: 'Create contract' }));
    fireEvent.click(screen.getByRole('radio', { name: /then notarize/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith(expect.objectContaining({ type: 'createContractText', contractId: 'c-tp',
      signMode: 'notarize' })));
  });
  it('shows in plain words and must be chosen before sending', () => {
    state.contractTexts = [text({ signMode: 'notarize' })];
    const { unmount } = page();
    fireEvent.click(screen.getByRole('button', { name: 'Rooms' }));
    fireEvent.click(room().getByRole('button', { name: /Pending · Pia Cruz/ }));
    expect(screen.getByText('Signing: Sign online, then notarize')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send to tenant' })).toBeEnabled();
    unmount();
    state.contractTexts = [text({ signMode: null })];
    sheet();
    expect(screen.getByRole('button', { name: 'Send to tenant' })).toBeDisabled();
    expect(screen.getByText(/Choose how the contract is signed/)).toBeInTheDocument();
  });
});

describe('Edit property', () => {
  const form = (role: RentalProperty['role'], onSave = vi.fn<(input: PropertyInput) => Promise<void>>(async () => undefined)) => {
    render(<MemoryRouter><PropertyForm property={{ ...property, role, requireContract: false }} myName="" busy={false} onSave={onSave} onCancel={vi.fn()} /></MemoryRouter>);
    return onSave;
  };
  it('lets the owner require a signed contract before move-in', async () => {
    const onSave = form('owner');
    expect(screen.getByText('New tenants stay Pending until they sign and you countersign. Their move-in bill is made then.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: /Require a signed contract before move-in/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Save property' }));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ requireContract: true })));
  });
  it('hides the switch from others and never sends it', async () => {
    const onSave = form('manager');
    expect(screen.queryByRole('checkbox', { name: /Require a signed contract/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Save property' }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0]).not.toHaveProperty('requireContract');
  });
});

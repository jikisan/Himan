import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { MeterReading, RentalBill, RentalProperty, RentalTenancy, RentalUnit, Renter, UtilityBill } from '@himan/shared/rentals';
import { RentalsPage } from '../presentation/pages/RentalsPage';

const unit = (id: string, name: string, kind: RentalUnit['kind'], capacity: number, extra: Partial<RentalUnit> = {}): RentalUnit => ({
  id, propertyId: 'p', name, kind, capacity, electricMode: 'none', electricAmountCentavos: 0, waterMode: 'none',
  waterAmountCentavos: 0, defaultRentCentavos: 0, extraPersonRentCentavos: 0, ...extra });
const property: RentalProperty = {
  id: 'p', createdBy: 'owner', name: 'Bakilid House', address: '', ownerName: '', ownerAddress: '',
  lessorName: 'Owner', lessorCivilStatus: '', lessorAddress: '', lessorCapacity: 'owner', signingCity: '',
  invoicePrefix: 'INV', lateFeeCentavos: 0, rentDueDay: null, archivedAt: null, createdAt: '', updatedAt: '', role: 'owner',
  units: [unit('u1', 'Room A', 'bedspace', 4, { defaultRentCentavos: 350000 }), unit('u2', 'Room B', 'room', 1)],
};
const person = (id: string, fullName: string): Renter => ({ id, propertyId: 'p', fullName, phone: '0917', facebook: '', email: '',
  address: '', emergencyName: '', emergencyPhone: '', occupants: 1, notes: '', files: [] });
const stay = (id: string, unitId: string, renterId: string, moveIn: string, moveOut: string | null = null): RentalTenancy => ({
  id, propertyId: 'p', unitId, renterId, moveIn, moveOut, charges: [],
  contracts: [{ id: `c-${id}`, tenancyId: id, startDate: moveIn, endDate: '2027-10-01', monthlyRentCentavos: 350000,
    dueDay: 30, advanceMonths: 1, depositCentavos: 350000, status: moveOut ? 'ended' : 'active' }] });

const state = vi.hoisted(() => ({
  properties: [] as RentalProperty[], renters: [] as Renter[], tenancies: [] as RentalTenancy[],
  bills: [] as RentalBill[], readings: [] as MeterReading[], utilityBills: [] as UtilityBill[],
  online: true, userId: 'owner', myName: 'Maria Santos', loading: false, error: null, busy: false,
  run: vi.fn(), refetch: vi.fn(), fileUrl: vi.fn(), listMembers: vi.fn(async () => []), listFriends: vi.fn(async () => []),
}));
vi.mock('../presentation/hooks/useRentals', () => ({ useRentals: () => state }));
const toasts = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn() }));
vi.mock('sonner', () => ({ toast: toasts }));

beforeEach(() => {
  vi.clearAllMocks();
  // Rent is due on the 30th in these fixtures; the 10th keeps "due soon" out of unrelated tests.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-10T02:00:00Z'));
  state.myName = 'Maria Santos';
  state.properties = [property];
  state.renters = [person('r1', 'Ana Cruz'), person('r2', 'Ben Reyes'), person('r3', 'Carlo Lim'), person('r4', 'Dina Past')];
  state.tenancies = [stay('t1', 'u1', 'r1', '2026-01-01'), stay('t2', 'u1', 'r2', '2026-02-01'), stay('t3', 'u2', 'r3', '2026-03-01'),
    stay('t4', 'u2', 'r4', '2025-01-01', '2025-12-01')];
  state.bills = [];
  state.run.mockResolvedValue(undefined);
});
// Opens on a tab (Rooms by default) when the property screen is showing.
const page = (tab = 'Rooms') => {
  const view = render(<MemoryRouter><RentalsPage /></MemoryRouter>);
  const button = screen.queryByRole('button', { name: tab });
  if (button) fireEvent.click(button);
  return view;
};
const card = (name: string) => within(screen.getByRole('region', { name }));

describe('Rooms board', () => {
  it('shows each bed of a shared room, filled first, with an add slot per free bed', () => {
    page();
    expect(card('Room A').getByText('Ana Cruz')).toBeInTheDocument();
    expect(card('Room A').getByText('Ben Reyes')).toBeInTheDocument();
    expect(card('Room A').getAllByRole('button', { name: 'Add tenant' })).toHaveLength(2);
    expect(card('Room A').getByText('Shared room · 4 beds')).toBeInTheDocument();
  });
  it('offers no add slot in a full room', () => {
    page();
    expect(card('Room B').getByText('Carlo Lim')).toBeInTheDocument();
    expect(card('Room B').queryByRole('button', { name: 'Add tenant' })).not.toBeInTheDocument();
  });
  it('shows rent and due day in plain words', () => {
    page();
    expect(card('Room B').getByText('₱3,500.00/mo · due every 30th')).toBeInTheDocument();
  });
  it('is read-only for a viewer', () => {
    state.properties = [{ ...property, role: 'viewer' }];
    page();
    expect(card('Room A').getAllByText('Empty')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: 'Add tenant' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Move out/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Room A options' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Share' })).not.toBeInTheDocument();
  });
  it('asks before deleting a room', async () => {
    page();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Room B options' }), { button: 0, ctrlKey: false });
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Delete room' }));
    expect(state.run).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: 'Delete room' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'removeUnit', id: 'u2' }));
  });
  it('lets the owner open sharing and hides it from managers', () => {
    const { unmount } = page();
    expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument();
    unmount();
    state.properties = [{ ...property, role: 'manager' }];
    page();
    expect(screen.queryByRole('button', { name: 'Share' })).not.toBeInTheDocument();
  });
});

describe('Tenants view', () => {
  const openTenants = () => { page(); fireEvent.click(screen.getByRole('button', { name: 'Tenants' })); };
  it('lists current tenants with their room and hides past ones until asked', () => {
    openTenants();
    expect(screen.getByRole('button', { name: /Ana Cruz/ })).toHaveTextContent('Room A');
    expect(screen.queryByText('Dina Past')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Show past tenants' }));
    expect(screen.getByRole('button', { name: /Dina Past/ })).toHaveTextContent('Moved out');
  });
  it('filters by name', () => {
    openTenants();
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search tenants' }), { target: { value: 'ben' } });
    expect(screen.getByText('Ben Reyes')).toBeInTheDocument();
    expect(screen.queryByText('Ana Cruz')).not.toBeInTheDocument();
  });
});

describe('Add tenant', () => {
  const openAdd = () => { page(); fireEvent.click(card('Room A').getAllByRole('button', { name: 'Add tenant' })[0]); };
  it('needs only name, mobile, move-in and rent, and fills the rest', async () => {
    openAdd();
    expect(screen.getByLabelText('Monthly rent')).toHaveValue('3500.00');
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Elle Tan' } });
    fireEvent.change(screen.getByLabelText('Mobile number'), { target: { value: '0918' } });
    fireEvent.change(screen.getByLabelText('Move-in date'), { target: { value: '2026-11-15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Move in' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith(expect.objectContaining({
      type: 'addTenant', propertyId: 'p', unitId: 'u1', renterId: null, moveIn: '2026-11-15',
      renter: expect.objectContaining({ fullName: 'Elle Tan', phone: '0918' }),
      terms: { startDate: '2026-11-15', endDate: '2027-11-15', monthlyRentCentavos: 350000, dueDay: 15,
        advanceMonths: 1, depositCentavos: 350000 } })));
  });
  it('shows what is due on move-in', () => {
    openAdd();
    expect(screen.getByText('₱7,000.00')).toBeInTheDocument();
  });
  it('shows advance and deposit next to the rent, and the total follows them', () => {
    openAdd();
    expect(screen.getByLabelText('Advance months').closest('details')).toBeNull();
    expect(screen.getByLabelText('Deposit').closest('details')).toBeNull();
    fireEvent.change(screen.getByLabelText('Advance months'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Deposit'), { target: { value: '7,000' } });
    expect(screen.getByText('₱14,000.00')).toBeInTheDocument();
  });
  it('can pick someone already on file', async () => {
    openAdd();
    fireEvent.click(screen.getByRole('button', { name: 'Already a tenant' }));
    fireEvent.change(screen.getByLabelText('Tenant'), { target: { value: 'r4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Move in' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith(expect.objectContaining({ type: 'addTenant', renterId: 'r4', renter: null })));
  });
  it('asks for a mobile number for a new person', async () => {
    openAdd();
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Elle Tan' } });
    fireEvent.click(screen.getByRole('button', { name: 'Move in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter the tenant’s mobile number');
    expect(state.run).not.toHaveBeenCalled();
  });
  it('explains a zero rent in plain words', async () => {
    openAdd();
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Elle Tan' } });
    fireEvent.change(screen.getByLabelText('Mobile number'), { target: { value: '0918' } });
    fireEvent.change(screen.getByLabelText('Monthly rent'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Move in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter the monthly rent');
  });
  it('keeps contact in its own section, and explains it for someone already on file', () => {
    openAdd();
    expect(screen.getByLabelText('Emergency contact name').closest('details')).toHaveTextContent('Contact and emergency');
    fireEvent.click(screen.getByRole('button', { name: 'Already a tenant' }));
    expect(screen.getByText('Their contact details are already on file. Change them from their tenant sheet after moving them in.')).toBeInTheDocument();
  });
  it('breaks down what to collect on move-in', () => {
    openAdd();
    expect(screen.getByText('Advance · 1 month').nextElementSibling).toHaveTextContent('₱3,500.00');
    expect(screen.getByText('Deposit', { selector: 'dt' }).nextElementSibling).toHaveTextContent('₱3,500.00');
    fireEvent.click(screen.getByRole('button', { name: 'One month more' }));
    expect(screen.getByText('Advance · 2 months')).toBeInTheDocument();
  });
  it('opens More details when the problem is hidden inside it', async () => {
    openAdd();
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Elle Tan' } });
    fireEvent.change(screen.getByLabelText('Mobile number'), { target: { value: '0918' } });
    fireEvent.change(screen.getByLabelText('Contract ends'), { target: { value: '2020-01-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Move in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Contract must end after it starts');
    expect(screen.getByText('Contract').closest('details')).toHaveAttribute('open');
  });
  it('asks for a name before saving', async () => {
    openAdd();
    fireEvent.click(screen.getByRole('button', { name: 'Move in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter the tenant’s name');
    expect(state.run).not.toHaveBeenCalled();
  });
});

describe('Tenant sheet and move out', () => {
  it('edits rent and due day, refusing a due day of 32', async () => {
    page();
    fireEvent.click(card('Room B').getByRole('button', { name: /^Carlo Lim/ }));
    expect(screen.getByText(/Lives in Room B since Mar 1, 2026/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Change rent' }));
    fireEvent.change(screen.getByLabelText('Due day'), { target: { value: '32' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Due day is 1–31')).toBeInTheDocument();
    expect(state.run).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Due day'), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText('Rent per month'), { target: { value: '4,000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    fireEvent.change(screen.getByLabelText('Advance months'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Deposit'), { target: { value: '8,000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'updateTerms', contractId: 'c-t3',
      input: { monthlyRentCentavos: 400000, dueDay: 5, advanceMonths: 2, depositCentavos: 800000 } }));
  });
  it('shows ID files as previews and asks before removing one', async () => {
    state.renters = state.renters.map((r) => (r.id === 'r3' ? { ...r, files: [
      { id: 'f1', renterId: 'r3', propertyId: 'p', name: 'national-id.jpg', mimeType: 'image/jpeg', size: 245760, storagePath: 'x', ready: true },
      { id: 'f2', renterId: 'r3', propertyId: 'p', name: 'contract.pdf', mimeType: 'application/pdf', size: 2_200_000, storagePath: 'y', ready: true }] } : r));
    state.fileUrl.mockResolvedValue('https://files.example/signed.jpg');
    state.run.mockResolvedValue(undefined);
    page();
    fireEvent.click(card('Room B').getByRole('button', { name: /^Carlo Lim/ }));
    const files = within(screen.getByRole('region', { name: 'Valid ID' }));
    await waitFor(() => expect(files.getByRole('button', { name: 'View national-id.jpg' }).querySelector('img')).toHaveAttribute('src', 'https://files.example/signed.jpg'));
    expect(state.fileUrl).toHaveBeenCalledTimes(1);
    expect(files.getByText('PDF')).toBeInTheDocument();
    expect(files.getByText('240 KB')).toBeInTheDocument();
    expect(files.getByText('2.1 MB')).toBeInTheDocument();
    fireEvent.click(files.getByRole('button', { name: 'Remove contract.pdf' }));
    expect(state.run).not.toHaveBeenCalled();
    fireEvent.click(files.getByRole('button', { name: 'Remove' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'removeRenterFile', id: 'f2' }));
  });
  it('links Messenger from the sheet', () => {
    state.renters = state.renters.map((r) => (r.id === 'r3' ? { ...r, facebook: 'carlo.lim' } : r));
    page();
    fireEvent.click(card('Room B').getByRole('button', { name: /^Carlo Lim/ }));
    const sheet = within(screen.getByRole('dialog'));
    expect(sheet.getByRole('link', { name: 'Messenger' })).toHaveAttribute('href', 'https://m.me/carlo.lim');
    expect(sheet.getByRole('link', { name: 'carlo.lim (opens Facebook)' })).toHaveAttribute('target', '_blank');
  });
  it('shows a short label for a long Messenger link', () => {
    const long = 'https://www.messenger.com/e2ee/t/7493840129384712/?ref=abc&tracking=xyz';
    state.renters = state.renters.map((r) => (r.id === 'r3' ? { ...r, facebook: long } : r));
    page();
    fireEvent.click(card('Room B').getByRole('button', { name: /^Carlo Lim/ }));
    const link = within(screen.getByRole('dialog')).getByRole('link', { name: 'Messenger chat (opens Facebook)' });
    expect(link).toHaveAttribute('href', long);
  });
  it('moves a tenant out from their sheet', async () => {
    page();
    fireEvent.click(card('Room B').getByRole('button', { name: /^Carlo Lim/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Move Carlo Lim out of Room B' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirm move out' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith(expect.objectContaining({ type: 'moveOut', tenancyId: 't3' })));
  });
  it('shows contact read-only until Edit, then saves without closing the sheet', async () => {
    page();
    fireEvent.click(card('Room B').getByRole('button', { name: /^Carlo Lim/ }));
    expect(screen.queryByLabelText('Full name')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Edit contact' }));
    fireEvent.change(screen.getByLabelText('Mobile number'), { target: { value: '0999' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save tenant' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith(expect.objectContaining({ type: 'saveRenter', id: 'r3',
      input: expect.objectContaining({ phone: '0999' }) })));
    expect(screen.getByRole('dialog', { name: 'Carlo Lim' })).toBeInTheDocument();
  });
  it('refuses a move-out before move-in and records a valid date', async () => {
    page();
    fireEvent.click(card('Room B').getByRole('button', { name: 'Move out Carlo Lim' }));
    const date = screen.getByLabelText('Move-out date');
    fireEvent.change(date, { target: { value: '2026-02-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm move out' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Move-out can’t be before move-in (Mar 1, 2026)');
    expect(state.run).not.toHaveBeenCalled();
    fireEvent.change(date, { target: { value: '2026-09-30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm move out' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'moveOut', tenancyId: 't3', moveOut: '2026-09-30', readings: [] }));
  });
});


describe('Per-person room price', () => {
  it('prices a private room by headcount until the rent is typed over', async () => {
    state.properties = [{ ...property, units: [...property.units, unit('u3', 'Room C', 'room', 1,
      { defaultRentCentavos: 300000, extraPersonRentCentavos: 50000 })] }];
    page();
    expect(card('Room C').getByText('Private room · +₱500.00 per extra person')).toBeInTheDocument();
    fireEvent.click(card('Room C').getByRole('button', { name: 'Add tenant' }));
    expect(screen.getByLabelText('Monthly rent')).toHaveValue('3000.00');
    fireEvent.change(screen.getByLabelText('People in the room'), { target: { value: '2' } });
    expect(screen.getByLabelText('Monthly rent')).toHaveValue('3500.00');
    expect(screen.getByText('₱3,000.00 + ₱500.00 × 1 extra person')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Monthly rent'), { target: { value: '3,200' } });
    fireEvent.change(screen.getByLabelText('People in the room'), { target: { value: '3' } });
    expect(screen.getByLabelText('Monthly rent')).toHaveValue('3,200');
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Elle Tan' } });
    fireEvent.change(screen.getByLabelText('Mobile number'), { target: { value: '0918' } });
    fireEvent.click(screen.getByRole('button', { name: 'Move in' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith(expect.objectContaining({ type: 'addTenant', unitId: 'u3',
      renter: expect.objectContaining({ occupants: 3 }), terms: expect.objectContaining({ monthlyRentCentavos: 320000 }) })));
  });
  it('saves the extra-person price on a room', async () => {
    page();
    fireEvent.click(screen.getByRole('button', { name: 'Add room' }));
    fireEvent.change(screen.getByLabelText('Room name'), { target: { value: 'Room C' } });
    fireEvent.change(screen.getByLabelText('Usual rent'), { target: { value: '3,000' } });
    fireEvent.change(screen.getByLabelText('Extra per added person'), { target: { value: '500' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save room' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith(expect.objectContaining({ type: 'saveUnit',
      input: expect.objectContaining({ defaultRentCentavos: 300000, extraPersonRentCentavos: 50000 }) })));
  });
});

describe('Overview', () => {
  it('lists rent due in the next 7 days', () => {
    vi.setSystemTime(new Date('2026-10-26T02:00:00Z'));
    page('Home');
    const due = within(screen.getByRole('region', { name: 'Rent due in the next 7 days' }));
    expect(due.getByRole('button', { name: /Ana Cruz.*Room A.*in 4 days/ })).toBeInTheDocument();
    expect(due.getAllByRole('button')).toHaveLength(3);
  });
  it('hides rent due later than a week', () => {
    page('Home');
    expect(screen.queryByRole('region', { name: 'Rent due in the next 7 days' })).not.toBeInTheDocument();
  });
  it('switches property from the dropdown by the name', () => {
    state.properties = [property, { ...property, id: 'p2', name: 'Mabolo Studio', units: [] }];
    page();
    fireEvent.pointerDown(screen.getByRole('button', { name: /switch property/ }), { button: 0, ctrlKey: false });
    fireEvent.click(screen.getByRole('menuitem', { name: /^Mabolo Studio/ }));
    expect(screen.getByRole('heading', { name: /^Mabolo Studio/ })).toBeInTheDocument();
    expect(screen.getByText('No rooms yet')).toBeInTheDocument();
  });
});

describe('First property setup', () => {
  const start = () => { state.properties = []; page(); fireEvent.click(screen.getByRole('button', { name: 'New property' })); };
  const next = () => fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  it('walks through house, rooms and utilities, then saves everything at once', async () => {
    state.run.mockResolvedValue({ propertyId: 'p2', failed: [] });
    start();
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Property name'), { target: { value: 'Lahug House' } });
    next();
    fireEvent.change(screen.getAllByLabelText('Room name')[0], { target: { value: 'Room A' } });
    fireEvent.change(screen.getAllByLabelText('Usual rent')[0], { target: { value: '3,000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add another room' }));
    expect(screen.getAllByLabelText('Room name')[1]).toHaveValue('Room B');
    next();
    fireEvent.change(screen.getByLabelText('Electricity'), { target: { value: 'submeter' } });
    fireEvent.change(screen.getByLabelText('Price per kWh'), { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Finish setup' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'setupProperty',
      input: expect.objectContaining({ name: 'Lahug House', ownerName: 'Maria Santos', lessorName: 'Maria Santos' }),
      rooms: [expect.objectContaining({ name: 'Room A', kind: 'room', defaultRentCentavos: 300000, electricMode: 'submeter', electricAmountCentavos: 2000 }),
        expect.objectContaining({ name: 'Room B', electricMode: 'submeter', electricAmountCentavos: 2000, waterMode: 'none' })] }));
  });
  it('makes a shared room from the room type switch and counts its beds', async () => {
    state.run.mockResolvedValue({ propertyId: 'p2', failed: [] });
    start();
    fireEvent.change(screen.getByLabelText('Property name'), { target: { value: 'Lahug House' } });
    next();
    fireEvent.click(screen.getByRole('radio', { name: 'Shared room' }));
    fireEvent.change(screen.getByLabelText('Beds'), { target: { value: '4' } });
    expect(screen.getByText('1 room · 4 beds')).toBeInTheDocument();
    next();
    fireEvent.click(screen.getByRole('button', { name: 'Finish setup' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith(expect.objectContaining({
      rooms: [expect.objectContaining({ kind: 'bedspace', capacity: 4 })] })));
  });
  it('needs a property name before moving on', () => {
    start();
    next();
    expect(screen.getByRole('alert')).toHaveTextContent('Enter a property name');
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
  });
  it('makes one whole-house room when the house is rented as a whole', async () => {
    state.run.mockResolvedValue({ propertyId: 'p2', failed: [] });
    start();
    fireEvent.change(screen.getByLabelText('Property name'), { target: { value: 'Lahug House' } });
    next();
    fireEvent.click(screen.getByRole('checkbox', { name: 'I rent out the whole house to one household' }));
    expect(screen.queryByLabelText('Room name')).not.toBeInTheDocument();
    next();
    fireEvent.click(screen.getByRole('button', { name: 'Finish setup' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith(expect.objectContaining({
      rooms: [expect.objectContaining({ name: 'Whole house', kind: 'whole', capacity: 1 })] })));
  });
  it('names the rooms that could not be saved', async () => {
    state.run.mockResolvedValue({ propertyId: 'p2', failed: ['Room B'] });
    start();
    fireEvent.change(screen.getByLabelText('Property name'), { target: { value: 'Lahug House' } });
    next();
    fireEvent.click(screen.getByRole('button', { name: 'Add another room' }));
    next();
    fireEvent.click(screen.getByRole('button', { name: 'Finish setup' }));
    await waitFor(() => expect(toasts.warning).toHaveBeenCalledWith('Saved, but couldn’t add Room B. Add it from the Rooms board.'));
  });
});

describe('Property and room forms', () => {
  it('keeps contract details out of the way but still saves my name when ticked', async () => {
    page();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByText('Contract details – fill in later')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Use my name as owner name' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save property' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith(expect.objectContaining({ type: 'saveProperty', id: 'p',
      input: expect.objectContaining({ ownerName: 'Maria Santos' }) })));
  });
  it('saves a room with its usual rent and a readable error for a bad rate', async () => {
    page();
    fireEvent.click(screen.getByRole('button', { name: 'Add room' }));
    fireEvent.change(screen.getByLabelText('Room name'), { target: { value: 'Room C' } });
    fireEvent.change(screen.getByLabelText('Electricity'), { target: { value: 'submeter' } });
    fireEvent.change(screen.getByLabelText('Price per kWh'), { target: { value: 'twelve' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save room' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter an amount like 10,000 or 1,500.50');
    fireEvent.change(screen.getByLabelText('Price per kWh'), { target: { value: '12.50' } });
    fireEvent.change(screen.getByLabelText('Usual rent'), { target: { value: '4,500' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save room' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'saveUnit', propertyId: 'p', id: null,
      input: expect.objectContaining({ name: 'Room C', electricAmountCentavos: 1250, defaultRentCentavos: 450000 }) }));
  });
});

describe('Property summary edge cases', () => {
  it('asks for a first room on Home when there are no rooms', () => {
    state.properties = [{ ...property, units: [] }];
    state.tenancies = [];
    page('Home');
    expect(screen.getByText('Add your first room')).toBeInTheDocument();
    expect(screen.queryByText(/free bed/)).not.toBeInTheDocument();
  });
});

describe('Bills in the existing screens', () => {
  const metered = (u: RentalUnit) => ({ ...u, electricMode: 'submeter' as const, electricAmountCentavos: 1600 });
  const openDetails = () => fireEvent.click(screen.getByText('Meters and extra charges'));
  it('takes starting readings and extra charges when moving someone in', async () => {
    state.run.mockResolvedValue({ renterId: 'r9', warnings: [] });
    state.properties = [{ ...property, units: [metered(property.units[0]), property.units[1]] }];
    page();
    fireEvent.click(card('Room A').getAllByRole('button', { name: 'Add tenant' })[0]);
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Elle Tan' } });
    fireEvent.change(screen.getByLabelText('Mobile number'), { target: { value: '0918' } });
    openDetails();
    fireEvent.change(screen.getByLabelText('Electricity reading today'), { target: { value: '1200' } });
    fireEvent.click(screen.getByRole('button', { name: 'Other' }));
    fireEvent.change(screen.getByLabelText('Charge name'), { target: { value: 'Parking' } });
    fireEvent.change(screen.getByLabelText('Charge amount'), { target: { value: '1,000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Move in' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith(expect.objectContaining({ type: 'addTenant',
      readings: [{ kind: 'electric', value: 1200 }], charges: [{ label: 'Parking', amount: 100000 }] })));
    expect(toasts.success).toHaveBeenCalledWith('Elle Tan moved in');
  });
  it('uses the property due date and charges the days until it on move-in', async () => {
    state.run.mockResolvedValue({ renterId: 'r9', warnings: [] });
    state.properties = [{ ...property, rentDueDay: 5 }];
    page();
    fireEvent.click(card('Room A').getAllByRole('button', { name: 'Add tenant' })[0]);
    fireEvent.change(screen.getByLabelText('Move-in date'), { target: { value: '2026-10-15' } });
    expect(screen.getByText('₱9,450.00')).toBeInTheDocument();
    expect(screen.getByText('Rent for 21 days before the first due date')).toBeInTheDocument();
    expect(screen.getByText('Advance · 1 month')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Elle Tan' } });
    fireEvent.change(screen.getByLabelText('Mobile number'), { target: { value: '0918' } });
    fireEvent.click(screen.getByRole('button', { name: 'Move in' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith(expect.objectContaining({ terms: expect.objectContaining({ dueDay: 5 }) })));
  });
  it('asks for a final reading when moving out of a metered room', async () => {
    state.run.mockResolvedValue({ warnings: [], finalBillId: 'b' });
    state.properties = [{ ...property, units: [property.units[0], metered(property.units[1])] }];
    page();
    fireEvent.click(card('Room B').getByRole('button', { name: 'Move out Carlo Lim' }));
    fireEvent.change(screen.getByLabelText('Final electricity reading (optional)'), { target: { value: '900' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm move out' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'moveOut', tenancyId: 't3', moveOut: '2026-10-10',
      readings: [{ kind: 'electric', value: 900 }] }));
    expect(toasts.success).toHaveBeenCalledWith('Moved out. Final SOA generated.');
  });
  it('saves extra monthly charges from the tenant sheet', async () => {
    page();
    fireEvent.click(card('Room B').getByRole('button', { name: /^Carlo Lim/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Wi-Fi' }));
    expect(screen.getByLabelText('Charge name')).toHaveValue('Wi-Fi');
    expect(screen.queryByRole('button', { name: 'Wi-Fi' })).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Charge amount'), { target: { value: '300' } });
    expect(screen.getByText('Total each month').nextElementSibling).toHaveTextContent('₱300.00');
    fireEvent.click(screen.getByRole('button', { name: 'Save charges' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'setCharges', tenancyId: 't3', charges: [{ label: 'Wi-Fi', amount: 30000 }] }));
  });
  it('turns a rent change into “new rent from” once bills exist', async () => {
    const bill = (kind: RentalBill['kind'], period: string): RentalBill => ({ id: `${kind}-${period}`, propertyId: 'p', tenancyId: 't3', kind,
      period, number: 'INV-2026-0001', issuedOn: '2026-10-01', dueOn: '2026-10-30', lines: [{ kind: 'rent', label: 'Rent', amount: 350000 }],
      status: 'issued', voidReason: '' });
    state.bills = [bill('move_in', '2026-03'), bill('monthly', '2026-10')];
    page();
    fireEvent.click(card('Room B').getByRole('button', { name: /^Carlo Lim/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Change rent' }));
    expect(screen.queryByLabelText('Rent per month')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Advance months')).toHaveAttribute('readonly');
    expect(screen.getAllByText('On the move-in bill').length).toBeGreaterThan(0);
    fireEvent.change(screen.getByLabelText('New rent'), { target: { value: '4,000' } });
    fireEvent.change(screen.getByLabelText('Starting'), { target: { value: '2026-11' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'changeRent', contractId: 'c-t3', from: '2026-11-01', rentCentavos: 400000 }));
  });
  it('saves the property due date and late fee', async () => {
    page();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Rent is due every'), { target: { value: '5' } });
    expect(screen.getByText('New tenants get this date. Change existing tenants on their tenant sheet.')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Late fee'), { target: { value: '500' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save property' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith(expect.objectContaining({ type: 'saveProperty',
      input: expect.objectContaining({ rentDueDay: 5, lateFeeCentavos: 50000 }) })));
  });
  it('asks for the due date in setup and makes the bill prefix from the name', async () => {
    state.run.mockResolvedValue({ propertyId: 'p2', failed: [] });
    state.properties = [];
    page();
    fireEvent.click(screen.getByRole('button', { name: 'New property' }));
    fireEvent.change(screen.getByLabelText('Property name'), { target: { value: 'Lahug Units' } });
    fireEvent.change(screen.getByLabelText('Rent is due every'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.click(screen.getByRole('button', { name: 'Finish setup' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith(expect.objectContaining({ type: 'setupProperty',
      input: expect.objectContaining({ invoicePrefix: 'LU', rentDueDay: 5 }) })));
  });
});

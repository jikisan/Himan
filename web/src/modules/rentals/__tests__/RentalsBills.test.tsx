import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { MeterReading, RentalBill, RentalProperty, RentalTenancy, RentalUnit, Renter, UtilityBill } from '@himan/shared/rentals';
import { RentalsPage } from '../presentation/pages/RentalsPage';

const U1 = '00000000-0000-0000-0000-000000000001';
const U2 = '00000000-0000-0000-0000-000000000002';
const unit = (id: string, name: string, kind: RentalUnit['kind'], capacity: number, extra: Partial<RentalUnit> = {}): RentalUnit => ({
  id, propertyId: 'p', name, kind, capacity, electricMode: 'none', electricAmountCentavos: 0, waterMode: 'none',
  waterAmountCentavos: 0, defaultRentCentavos: 0, extraPersonRentCentavos: 0, ...extra });
const property: RentalProperty = {
  id: 'p', createdBy: 'owner', name: 'Lahug Units', address: '', ownerName: 'Maria Santos', ownerAddress: 'Lahug, Cebu City',
  lessorName: '', lessorCivilStatus: '', lessorAddress: '', lessorCapacity: 'owner', signingCity: '', invoicePrefix: 'LU',
  lateFeeCentavos: 50000, rentDueDay: null, archivedAt: null, createdAt: '', updatedAt: '', role: 'owner',
  units: [unit(U1, 'Room 1', 'room', 1, { electricMode: 'submeter', electricAmountCentavos: 1600 }), unit(U2, 'Room A', 'bedspace', 2)],
};
const person = (id: string, fullName: string): Renter => ({ id, propertyId: 'p', fullName, phone: '0917', facebook: '', email: '',
  address: '', emergencyName: '', emergencyPhone: '', occupants: 1, notes: '', files: [] });
const stay = (id: string, unitId: string, renterId: string, moveIn: string, dueDay: number): RentalTenancy => ({
  id, propertyId: 'p', unitId, renterId, moveIn, moveOut: null, charges: [],
  contracts: [{ id: `c-${id}`, tenancyId: id, startDate: moveIn, endDate: '2027-12-01', monthlyRentCentavos: 350000,
    dueDay, advanceMonths: 1, depositCentavos: 350000, status: 'active' }] });
const issued = (tenancyId: string, extra: Partial<RentalBill> = {}): RentalBill => ({
  id: `b-${tenancyId}`, propertyId: 'p', tenancyId, kind: 'monthly', period: '2026-11', number: 'LU-2026-0002', issuedOn: '2026-11-01',
  dueOn: '2026-11-15', status: 'issued', voidReason: '', ...extra,
  lines: extra.lines ?? [{ kind: 'rent', label: 'Rent', amount: 350000, period: { from: '2026-11-15', to: '2026-12-14' } },
    { kind: 'electric', label: 'Electricity', amount: 240000, meter: { readings: ['r1'], fromDate: '2026-10-15', fromValue: 1200,
      toDate: '2026-11-10', toValue: 1350, usage: 150, rate: 1600, sharedWith: 1 } }] });

const state = vi.hoisted(() => ({
  properties: [] as RentalProperty[], renters: [] as Renter[], tenancies: [] as RentalTenancy[],
  bills: [] as RentalBill[], readings: [] as MeterReading[], utilityBills: [] as UtilityBill[], payments: [], accounts: [],
  online: true, userId: 'owner', myName: 'Maria Santos', loading: false, error: null, busy: false,
  run: vi.fn(), refetch: vi.fn(), fileUrl: vi.fn(), listMembers: vi.fn(async () => []), listFriends: vi.fn(async () => []),
}));
vi.mock('../presentation/hooks/useRentals', () => ({ useRentals: () => state }));
const toasts = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn() }));
vi.mock('sonner', () => ({ toast: toasts }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-10T02:00:00Z'));
  state.properties = [property];
  state.renters = [person('r1', 'Juan Dela Cruz'), person('r2', 'Ana Reyes'), person('r3', 'Ben Lim')];
  // Juan: metered room, needs a reading. Ana: billable. Ben: moved in Nov 1, covered by advance.
  state.tenancies = [stay('t1', U1, 'r1', '2026-01-15', 15), stay('t2', U2, 'r2', '2026-10-15', 15), stay('t3', U2, 'r3', '2026-11-01', 1)];
  state.readings = [{ id: 'r0', propertyId: 'p', unitId: U1, kind: 'electric', readOn: '2026-10-15', value: 1200, isReset: false }];
  state.bills = [];
  state.utilityBills = [];
  state.run.mockResolvedValue({ issued: 1, failed: [] });
});
const openBills = () => {
  render(<MemoryRouter><RentalsPage /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Bills' }));
};
const showCancelled = () => fireEvent.click(screen.getByRole('button', { name: /^Cancelled \d/ }));
const row = (name: string) => within(screen.getByRole('listitem', { name: new RegExp(name) }));

describe('Bills view', () => {
  it('opens on the current month and moves between months', () => {
    openBills();
    expect(screen.getByRole('heading', { name: 'November 2026' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(screen.getByRole('heading', { name: 'October 2026' })).toBeInTheDocument();
  });
  it('sums up the month: issued, ready and waiting for a reading', () => {
    openBills();
    expect(screen.queryByText(/SOAs generated ·/)).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: '1 SOA waiting for meter readings' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Ready for SOA · 1' })).toBeInTheDocument();
    expect(screen.getByRole('complementary', { name: 'Meter readings' })).toBeInTheDocument();
  });
  it('stops at the earliest move-in month', () => {
    state.tenancies = [stay('t2', U2, 'r2', '2026-10-15', 15)];
    openBills();
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(screen.getByRole('button', { name: 'Previous month' })).toBeDisabled();
  });
  it('shows each tenant’s state for the month', () => {
    openBills();
    expect(row('Juan Dela Cruz').getByText('Needs reading')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Ready for SOA · 1' })).getByText('Ana Reyes')).toBeInTheDocument();
    expect(row('Ana Reyes').getByText('₱3,500')).toBeInTheDocument();
    expect(screen.queryByRole('listitem', { name: /^Ben Lim/ })).not.toBeInTheDocument();
  });
  it('lets a tenant be billed without utilities this month', () => {
    openBills();
    fireEvent.click(row('Juan Dela Cruz').getByRole('button', { name: 'Skip utilities this month' }));
    expect(within(screen.getByRole('region', { name: 'Ready for SOA · 2' })).getByText('Juan Dela Cruz')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Generate all 2 SOAs/ })).toBeInTheDocument();
  });
  it('issues every ready bill at once', async () => {
    state.run.mockResolvedValue({ issued: 1, failed: [] });
    openBills();
    fireEvent.click(screen.getByRole('button', { name: 'Generate all 1 SOA · ₱3,500' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'issueBills', inputs: [{ tenancyId: 't2', kind: 'monthly',
      period: '2026-11', dueOn: '2026-11-15', lines: [{ kind: 'rent', label: 'Rent', amount: 350000, period: { from: '2026-11-15', to: '2026-12-14' } }] }] }));
    expect(toasts.success).toHaveBeenCalledWith('1 SOA generated. Copy each one as text.');
  });
  it('names the tenants whose bills failed', async () => {
    state.run.mockResolvedValue({ issued: 0, failed: ['t2'] });
    openBills();
    fireEvent.click(row('Ana Reyes').getByRole('button', { name: 'Generate SOA' }));
    await waitFor(() => expect(toasts.warning).toHaveBeenCalledWith('Couldn’t generate the SOA for Ana Reyes. Try again.'));
  });
  it('shows generated and cancelled SOAs without cluttering rows with the number', () => {
    state.bills = [issued('t1'), issued('t2', { id: 'void', status: 'void', number: 'LU-2026-0003' })];
    openBills();
    expect(row('Juan Dela Cruz').queryByText(/LU-2026-0002/)).not.toBeInTheDocument();
    expect(row('Juan Dela Cruz').getByText('₱5,900')).toBeInTheDocument();
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Ready for SOA · 1' })).getByText('Ana Reyes')).toBeInTheDocument();
  });
});

describe('Meter readings', () => {
  const input = () => screen.getByRole('spinbutton', { name: 'Room 1 electricity reading' });
  const save = () => fireEvent.click(screen.getByRole('button', { name: /^Save (readings|\d+ reading)/ }));
  const openAdd = () => { openBills(); fireEvent.click(screen.getByRole('button', { name: 'Add readings' })); };
  it('shows each room for the month, with what an SOA is waiting on', () => {
    openBills();
    expect(screen.getByRole('heading', { name: 'Meters · November 2026' })).toBeInTheDocument();
    expect(screen.getByText('1 meter needed for November SOAs.')).toBeInTheDocument();
    expect(screen.getByText('Not read in November')).toBeInTheDocument();
    expect(screen.getByText('Previous (Oct 15)').nextElementSibling).toHaveTextContent('1,200');
    expect(screen.getByText('Current').nextElementSibling).toHaveTextContent('Not read in November');
    expect(screen.getByText('Needed for November SOA')).toBeInTheDocument();
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
  });
  it('closes the meters panel from its × and reopens it from Meters', () => {
    openBills();
    fireEvent.click(screen.getByRole('button', { name: 'Close meters' }));
    expect(screen.queryByRole('complementary', { name: 'Meter readings' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Meters' }));
    expect(screen.getByRole('complementary', { name: 'Meter readings' })).toBeInTheDocument();
  });
  it('adds readings for every room from one dialog, with usage as you type', async () => {
    state.run.mockResolvedValue([]);
    openAdd();
    expect(screen.getByText('Last: 1,200 on Oct 15')).toBeInTheDocument();
    fireEvent.change(input(), { target: { value: '1350' } });
    expect(screen.getByText('Used 150 kWh → ₱2,400')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Date you read them'), { target: { value: '2026-11-09' } });
    save();
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'saveReadings', propertyId: 'p',
      inputs: [{ unitId: U1, kind: 'electric', readOn: '2026-11-09', value: 1350, isReset: false }] }));
    expect(toasts.success).toHaveBeenCalledWith('Reading saved');
  });
  it('refuses a lower reading unless the meter was reset', async () => {
    openAdd();
    fireEvent.change(input(), { target: { value: '1100' } });
    expect(screen.getByText('Lower than 1,200 on Oct 15. Tick “Meter was reset or replaced” if it was.')).toBeInTheDocument();
    save();
    expect(state.run).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Meter was reset or replaced' }));
    state.run.mockResolvedValue([]);
    save();
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'saveReadings', propertyId: 'p',
      inputs: [{ unitId: U1, kind: 'electric', readOn: '2026-11-10', value: 1100, isReset: true }] }));
  });
  it('replaces a reading made earlier the same day, comparing with the one before', async () => {
    state.run.mockResolvedValue([]);
    state.readings = [...state.readings, { id: 'r1', propertyId: 'p', unitId: U1, kind: 'electric', readOn: '2026-11-10', value: 1300, isReset: false }];
    openBills();
    fireEvent.click(screen.getByRole('button', { name: 'Meters' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add readings' }));
    fireEvent.change(input(), { target: { value: '1250' } });
    expect(screen.getByText('Replaces the 1,300 reading on Nov 10.')).toBeInTheDocument();
    expect(screen.getByText('Used 50 kWh → ₱800')).toBeInTheDocument();
    save();
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'saveReadings', propertyId: 'p',
      inputs: [{ unitId: U1, kind: 'electric', readOn: '2026-11-10', value: 1250, isReset: false }] }));
  });
  it('shows the month’s reading, usage and history, and follows the month picker', () => {
    state.readings = [...state.readings, { id: 'r1', propertyId: 'p', unitId: U1, kind: 'electric', readOn: '2026-11-05', value: 1300, isReset: false }];
    openBills();
    fireEvent.click(screen.getByRole('button', { name: 'Meters' }));
    expect(screen.getByText('Current (Nov 5)').nextElementSibling).toHaveTextContent('1,300');
    expect(screen.getByText('Total Consumption').nextElementSibling).toHaveTextContent('100 kWh');
    expect(screen.getByText('Amount (₱16/kWh)').nextElementSibling).toHaveTextContent('₱1,600');
    fireEvent.click(screen.getByRole('button', { name: 'Show Room 1 electricity history' }));
    expect(within(screen.getByRole('list', { name: 'Room 1 electricity history' })).getAllByRole('listitem')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(screen.getByRole('heading', { name: 'Meters · October 2026' })).toBeInTheDocument();
  });
  it('shows the latest 8 readings, then all on request', () => {
    state.readings = Array.from({ length: 10 }, (_, i) => ({ id: `h${i}`, propertyId: 'p', unitId: U1, kind: 'electric' as const,
      readOn: `2026-0${Math.floor(i / 9) + 1}-${String((i % 9) + 10)}`, value: 1000 + i * 10, isReset: false }));
    openBills();
    fireEvent.click(screen.getByRole('button', { name: 'Meters' }));
    fireEvent.click(screen.getByRole('button', { name: 'Show Room 1 electricity history' }));
    const history = () => within(screen.getByRole('list', { name: 'Room 1 electricity history' })).getAllByRole('listitem');
    expect(history()).toHaveLength(8);
    fireEvent.click(screen.getByRole('button', { name: 'Show all 10 readings' }));
    expect(history()).toHaveLength(10);
  });
  it('edits one reading from the history', async () => {
    state.run.mockResolvedValue([]);
    state.readings = [...state.readings, { id: 'r1', propertyId: 'p', unitId: U1, kind: 'electric', readOn: '2026-11-05', value: 1300, isReset: false }];
    openBills();
    fireEvent.click(screen.getByRole('button', { name: 'Meters' }));
    fireEvent.click(screen.getByRole('button', { name: 'Show Room 1 electricity history' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit Nov 5 reading' }));
    fireEvent.change(screen.getByLabelText('New value for Nov 5'), { target: { value: '1310' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'saveReadings', propertyId: 'p',
      inputs: [{ unitId: U1, kind: 'electric', readOn: '2026-11-05', value: 1310, isReset: false }] }));
  });
  it('locks a reading that an SOA uses and points to that SOA', () => {
    state.readings = [...state.readings, { id: 'r1', propertyId: 'p', unitId: U1, kind: 'electric', readOn: '2026-11-05', value: 1300, isReset: false }];
    state.bills = [issued('t1')];
    openBills();
    fireEvent.click(screen.getByRole('button', { name: 'Meters' }));
    fireEvent.click(screen.getByRole('button', { name: 'Show Room 1 electricity history' }));
    expect(screen.queryByRole('button', { name: 'Edit Nov 5 reading' })).not.toBeInTheDocument();
    expect(screen.getByText(/On Juan Dela Cruz’s November SOA\. Cancel that SOA to change this reading\./)).toBeInTheDocument();
  });
  it('is read-only for a viewer', () => {
    state.properties = [{ ...property, role: 'viewer' }];
    openBills();
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Generate/ })).not.toBeInTheDocument();
  });
});

describe('Issued bills', () => {
  it('copies a bill for Messenger straight from the list', async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    state.bills = [issued('t1')];
    openBills();
    fireEvent.click(row('Juan Dela Cruz').getByRole('button', { name: 'Copy Juan Dela Cruz’s monthly SOA as text' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringContaining('TOTAL ₱5,900')));
    expect(toasts.success).toHaveBeenCalledWith('Copied Juan Dela Cruz’s SOA as text. Paste it anywhere, like Messenger.');
  });
  it('marks an unpaid late bill Overdue and lists it first', () => {
    state.bills = [issued('t2', { id: 'b2', number: 'LU-2026-0003', dueOn: '2026-11-15' }), issued('t1', { dueOn: '2026-11-03' })];
    openBills();
    expect(row('Juan Dela Cruz').getByText('Overdue · 7 days')).toBeInTheDocument();
    expect(row('Ana Reyes').getByText('Unpaid')).toBeInTheDocument();
    const names = within(screen.getByRole('region', { name: 'SOAs generated · 2' })).getAllByRole('listitem').map((li) => li.getAttribute('aria-label'));
    expect(names).toEqual(['Monthly SOA LU-2026-0002 · Juan Dela Cruz · Room 1', 'Monthly SOA LU-2026-0003 · Ana Reyes · Room A']);
  });
  it('opens a bill only from View bill, not from the name', () => {
    state.bills = [issued('t1')];
    openBills();
    expect(row('Juan Dela Cruz').queryByRole('button', { name: /^Juan Dela Cruz/ })).not.toBeInTheDocument();
  });
  it('notes on a move-in SOA which months its advance covers', () => {
    state.bills = [issued('t3', { id: 'mi', kind: 'move_in', number: 'LU-2026-0001', period: '2026-11', dueOn: '2026-11-01' })];
    openBills();
    const soa = within(screen.getByRole('listitem', { name: /^Move-in SOA LU-2026-0001/ }));
    expect(soa.getByText('Includes November rent as advance. First monthly SOA: December 2026.')).toBeInTheDocument();
    expect(screen.queryByText(/Paid by advance/)).not.toBeInTheDocument();
  });
  it('flags a cancelled SOA with no replacement while cancelled ones are hidden', () => {
    state.bills = [issued('t1'), issued('t3', { id: 'mi', kind: 'move_in', status: 'void', number: 'LU-2026-0001', period: '2026-11', dueOn: '2026-11-01' })];
    openBills();
    expect(screen.getByText('1 cancelled SOA has no replacement.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show' }));
    expect(screen.getByRole('button', { name: /^Cancelled \d/ })).toHaveAttribute('aria-pressed', 'true');
  });
  it('hides cancelled SOAs until the Cancelled filter is picked', () => {
    state.bills = [issued('t1'), issued('t2', { id: 'void', status: 'void', number: 'LU-2026-0003' })];
    openBills();
    const list = () => within(screen.getByRole('region', { name: 'SOAs generated · 1' }));
    expect(list().queryByRole('listitem', { name: /LU-2026-0003/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Active 1' })).toHaveAttribute('aria-pressed', 'true');
    showCancelled();
    expect(list().getByRole('listitem', { name: /LU-2026-0003/ })).toBeInTheDocument();
    expect(list().queryByRole('listitem', { name: /LU-2026-0002/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'All 2' }));
    expect(list().getAllByRole('listitem')).toHaveLength(2);
  });
  it('makes a cancelled move-in SOA again from its lines', async () => {
    const lines = [{ kind: 'rent' as const, label: 'Advance rent', amount: 350000 }];
    state.bills = [issued('t3', { id: 'mi', kind: 'move_in', status: 'void', number: 'LU-2026-0001', period: '2026-11', dueOn: '2026-11-01', lines })];
    openBills();
    showCancelled();
    fireEvent.click(screen.getByRole('button', { name: 'Generate Ben Lim’s move-in SOA again' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'issueBills',
      inputs: [{ tenancyId: 't3', kind: 'move_in', period: '2026-11', dueOn: '2026-11-01', lines }] }));
  });
  it('works the electricity out again from a corrected reading', async () => {
    const moved = { ...state.tenancies.find((t) => t.id === 't1')!, moveOut: '2026-11-12' };
    state.tenancies = [...state.tenancies.filter((t) => t.id !== 't1'), moved];
    // Corrected after cancelling: 1,350 on Nov 10 (the cancelled SOA had 1,250, 50 kWh).
    state.readings = [...state.readings, { id: 'r2', propertyId: 'p', unitId: U1, kind: 'electric', readOn: '2026-11-10', value: 1350, isReset: false }];
    const stale = { kind: 'electric' as const, label: 'Electricity', amount: 80000, meter: { readings: ['r2'], fromDate: '2026-10-15', fromValue: 1200,
      toDate: '2026-11-10', toValue: 1250, usage: 50, rate: 1600, sharedWith: 1 } };
    state.bills = [issued('t1', { id: 'old', status: 'void', lines: [issued('t1').lines[0], stale] })];
    openBills();
    showCancelled();
    fireEvent.click(screen.getByRole('button', { name: 'Generate Juan Dela Cruz’s monthly SOA again' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'issueBills', inputs: [expect.objectContaining({
      lines: [issued('t1').lines[0], expect.objectContaining({ kind: 'electric', amount: 240000,
        meter: expect.objectContaining({ toValue: 1350, usage: 150 }) })] })] }));
  });
  it('remakes a cancelled monthly SOA only when it won’t come back as ready', () => {
    // Ana is ready for November again, so her cancelled November SOA gets no button.
    state.bills = [issued('t2', { id: 'void', status: 'void', number: 'LU-2026-0003' })];
    state.tenancies = [...state.tenancies.filter((t) => t.id !== 't1'),
      { ...state.tenancies.find((t) => t.id === 't1')!, moveOut: '2026-11-05' }];
    state.bills.push(issued('t1', { id: 'gone', status: 'void', number: 'LU-2026-0004' }));
    openBills();
    showCancelled();
    expect(screen.queryByRole('button', { name: 'Generate Ana Reyes’s monthly SOA again' })).not.toBeInTheDocument();
    // Juan moved out before the Nov 15 due date, so only the button can bring his November SOA back.
    expect(screen.getByRole('button', { name: 'Generate Juan Dela Cruz’s monthly SOA again' })).toBeInTheDocument();
  });
  it('opens a move-in bill from its View bill button', () => {
    state.bills = [issued('t3', { id: 'mi', kind: 'move_in', number: 'LU-2026-0001', period: '2026-11', dueOn: '2026-11-01' })];
    openBills();
    fireEvent.click(within(screen.getByRole('listitem', { name: /^Move-in SOA LU-2026-0001/ })).getByRole('button', { name: 'View Ben Lim’s move-in SOA' }));
    expect(within(screen.getByRole('dialog')).getByText('Statement of Account')).toBeInTheDocument();
  });
});

describe('Home', () => {
  const openHome = () => render(<MemoryRouter><RentalsPage /></MemoryRouter>);
  it('lists what to do this month and badges the Bills tab', () => {
    openHome();
    const todo = within(screen.getByRole('region', { name: 'To do for November' }));
    expect(todo.getByText('Read 1 meter')).toBeInTheDocument();
    expect(todo.getByText('Generate 1 SOA')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bills' })).toHaveTextContent('2');
  });
  it('opens Add readings on the Bills tab from Read meters', () => {
    openHome();
    fireEvent.click(screen.getByRole('button', { name: 'Read meters' }));
    expect(within(screen.getByRole('dialog', { name: 'Add readings' })).getByRole('spinbutton', { name: 'Room 1 electricity reading' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bills', hidden: true })).toHaveAttribute('aria-pressed', 'true');
  });
  it('reminds about a cancelled SOA nothing replaces, and See cancelled opens it', () => {
    state.bills = [issued('t3', { id: 'mi', kind: 'move_in', status: 'void', number: 'LU-2026-0001', period: '2026-11', dueOn: '2026-11-01' })];
    openHome();
    expect(screen.getByText('1 cancelled SOA not replaced')).toBeInTheDocument();
    expect(screen.getByText('Ben Lim (move-in)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bills' })).toHaveTextContent('3');
    fireEvent.click(screen.getByRole('button', { name: 'See cancelled' }));
    expect(screen.getByRole('button', { name: /^Cancelled \d/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Generate Ben Lim’s move-in SOA again' })).toBeInTheDocument();
  });
  it('counts an SOA cancelled several times once, and offers Generate again on the latest copy only', () => {
    state.bills = [
      issued('t3', { id: 'mi1', kind: 'move_in', status: 'void', number: 'LU-2026-0001', period: '2026-11', dueOn: '2026-11-01', issuedOn: '2026-11-01' }),
      issued('t3', { id: 'mi2', kind: 'move_in', status: 'void', number: 'LU-2026-0004', period: '2026-11', dueOn: '2026-11-01', issuedOn: '2026-11-03' })];
    openHome();
    expect(screen.getByText('1 cancelled SOA not replaced')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'See cancelled' }));
    expect(screen.getAllByRole('button', { name: 'Generate Ben Lim’s move-in SOA again' })).toHaveLength(1);
    expect(within(screen.getByRole('listitem', { name: /LU-2026-0004/ })).getByRole('button', { name: /again/ })).toBeInTheDocument();
  });
  it('does not nag about a cancelled monthly SOA that is ready to generate again', () => {
    state.bills = [issued('t2', { id: 'void', status: 'void', number: 'LU-2026-0003' })];
    openHome();
    expect(screen.queryByText(/cancelled SOA/)).not.toBeInTheDocument();
  });
  // Payments are recorded now, so every unpaid bill past its due date is Overdue, old and move-in ones included.
  it('lists every unpaid bill past its due date under Overdue, oldest first', () => {
    state.bills = [issued('t1', { dueOn: '2026-11-03' }), issued('t2', { id: 'old', period: '2026-08', dueOn: '2026-08-15' }),
      issued('t3', { id: 'mi', kind: 'move_in', period: '2026-11', dueOn: '2026-11-01' })];
    openHome();
    const overdue = within(screen.getByRole('region', { name: 'Overdue' }));
    expect(overdue.getAllByRole('button').map((b) => b.textContent)).toEqual([
      expect.stringContaining('Ana Reyes'), expect.stringContaining('Ben Lim'), expect.stringContaining('Juan Dela Cruz')]);
    expect(overdue.getByText('₱5,900 left · 7 days late')).toBeInTheDocument();
  });
});

describe('Statement and bill sheet', () => {
  const openJuanBill = (bill = issued('t1')) => {
    state.bills = [bill];
    openBills();
    fireEvent.click(row('Juan Dela Cruz').getByRole('button', { name: 'View Juan Dela Cruz’s monthly SOA' }));
    return within(screen.getByRole('dialog'));
  };
  it('shows the statement like the paper one', () => {
    const sheet = openJuanBill();
    expect(sheet.getByText('Statement of Account')).toBeInTheDocument();
    expect(sheet.getByText('LU-2026-0002')).toBeInTheDocument();
    expect(sheet.getByText('Rent (Nov 15 – Dec 14)')).toBeInTheDocument();
    expect(sheet.getByText('Oct 15, 2026')).toBeInTheDocument();
    expect(sheet.getByText('1,350')).toBeInTheDocument();
    expect(sheet.getByText('150 kWh × ₱16')).toBeInTheDocument();
    expect(sheet.getByText('Total amount payable')).toBeInTheDocument();
    expect(sheet.getByText('₱5,900')).toBeInTheDocument();
    expect(sheet.getByText('Nov 15, 2026')).toBeInTheDocument();
    expect(sheet.getByText('Late payment will have a penalty of ₱500.')).toBeInTheDocument();
  });
  it('copies the statement for Messenger', async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const sheet = openJuanBill();
    fireEvent.click(sheet.getByRole('button', { name: 'Copy for Messenger' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringContaining('TOTAL ₱5,900')));
    expect(toasts.success).toHaveBeenCalledWith('Copied. Paste it in Messenger.');
  });
  it('adds the late fee once when the bill is overdue', async () => {
    state.run.mockResolvedValue(undefined);
    const bill = issued('t1', { dueOn: '2026-11-03' });
    const sheet = openJuanBill(bill);
    fireEvent.click(sheet.getByRole('button', { name: 'Add late fee ₱500' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'updateBillLines', id: 'b-t1',
      lines: [...bill.lines, { kind: 'penalty', label: 'Late payment penalty', amount: 50000 }] }));
  });
  it('offers no late fee before the due date or once added', () => {
    expect(openJuanBill().queryByRole('button', { name: /Add late fee/ })).not.toBeInTheDocument();
  });
  it('edits amounts and adds a discount line', async () => {
    state.run.mockResolvedValue(undefined);
    const sheet = openJuanBill();
    fireEvent.click(sheet.getByRole('button', { name: 'Edit SOA' }));
    fireEvent.change(sheet.getByRole('textbox', { name: 'Rent (Nov 15 – Dec 14) amount' }), { target: { value: '3,000' } });
    fireEvent.click(sheet.getByRole('button', { name: 'Add other charge' }));
    fireEvent.change(sheet.getByRole('textbox', { name: 'Other charge name' }), { target: { value: 'Discount' } });
    fireEvent.change(sheet.getByRole('textbox', { name: 'Other charge amount' }), { target: { value: '-500' } });
    fireEvent.click(sheet.getByRole('button', { name: 'Save SOA' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'updateBillLines', id: 'b-t1', lines: [
      { ...issued('t1').lines[0], amount: 300000 }, issued('t1').lines[1], { kind: 'other', label: 'Discount', amount: -50000 }] }));
  });
  it('keeps meter lines read-only while editing', () => {
    const sheet = openJuanBill();
    fireEvent.click(sheet.getByRole('button', { name: 'Edit SOA' }));
    expect(sheet.queryByRole('textbox', { name: 'Electricity amount' })).not.toBeInTheDocument();
  });
  it('cancels a bill after confirming', async () => {
    state.run.mockResolvedValue(undefined);
    const sheet = openJuanBill();
    fireEvent.click(sheet.getByRole('button', { name: 'Cancel SOA' }));
    expect(screen.getByText('Cancel LU-2026-0002?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel this SOA' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'voidBill', id: 'b-t1', reason: '' }));
  });
  it('shows a cancelled bill without actions', () => {
    state.bills = [issued('t1', { status: 'void' })];
    openBills();
    showCancelled();
    fireEvent.click(screen.getByRole('button', { name: 'View Juan Dela Cruz’s monthly SOA' }));
    const sheet = within(screen.getByRole('dialog'));
    expect(sheet.getAllByText('Cancelled').length).toBeGreaterThan(0);
    expect(sheet.queryByRole('button', { name: 'Edit SOA' })).not.toBeInTheDocument();
    expect(sheet.queryByRole('button', { name: 'Cancel SOA' })).not.toBeInTheDocument();
  });
  it('previews a ready bill and issues it', async () => {
    openBills();
    fireEvent.click(row('Ana Reyes').getByRole('button', { name: 'View SOA' }));
    const sheet = within(screen.getByRole('dialog'));
    expect(sheet.getByText('Not generated yet')).toBeInTheDocument();
    fireEvent.click(sheet.getByRole('button', { name: 'Generate SOA' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith(expect.objectContaining({ type: 'issueBills' })));
  });
  it('lets a viewer only copy', () => {
    state.properties = [{ ...property, role: 'viewer' }];
    const sheet = openJuanBill();
    expect(sheet.getByRole('button', { name: 'Copy for Messenger' })).toBeInTheDocument();
    expect(sheet.queryByRole('button', { name: 'Edit SOA' })).not.toBeInTheDocument();
    expect(sheet.queryByRole('button', { name: 'Cancel SOA' })).not.toBeInTheDocument();
  });
});

describe('Electricity billed by the month’s bill amount', () => {
  // Room 1 is the whole house here: no meter, the actual electricity bill is typed each month.
  beforeEach(() => {
    state.properties = [{ ...property, units: [unit(U1, 'Room 1', 'room', 1, { electricMode: 'monthly', electricAmountCentavos: 0 }), property.units[1]] }];
    state.readings = [];
  });
  it('waits for the bill amount and saves it from the dialog', async () => {
    state.run.mockResolvedValue(undefined);
    openBills();
    expect(row('Juan Dela Cruz').getByText('Needs bill amount')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: '1 SOA waiting for bill amounts' })).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('region', { name: '1 SOA waiting for bill amounts' })).getByRole('button', { name: 'Add bill amounts' }));
    const dialog = within(screen.getByRole('dialog', { name: 'November 2026 bill amounts' }));
    fireEvent.change(dialog.getByLabelText('Room 1 · Electricity'), { target: { value: '2,345' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Save amounts' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'saveUtilityBills', propertyId: 'p',
      inputs: [{ unitId: U1, kind: 'electric', period: '2026-11', amountCentavos: 234500 }] }));
  });
  it('puts the month’s amount on the SOA', async () => {
    state.utilityBills = [{ id: 'ub', propertyId: 'p', unitId: U1, kind: 'electric', period: '2026-11', amountCentavos: 234500 }];
    openBills();
    fireEvent.click(row('Juan Dela Cruz').getByRole('button', { name: 'Generate SOA' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'issueBills', inputs: [expect.objectContaining({ tenancyId: 't1',
      lines: [expect.objectContaining({ kind: 'rent' }), { kind: 'electric', label: 'Electricity', amount: 234500, billMonth: '2026-11' }] })] }));
  });
  it('asks for the amount on Home', () => {
    render(<MemoryRouter><RentalsPage /></MemoryRouter>);
    expect(screen.getByText('Add November bill amount')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add bill amounts' }));
    expect(screen.getByRole('dialog', { name: 'November 2026 bill amounts' })).toBeInTheDocument();
  });
  it('shows the bill month on the SOA', () => {
    state.bills = [issued('t1', { lines: [issued('t1').lines[0], { kind: 'electric', label: 'Electricity', amount: 234500, billMonth: '2026-11' }] })];
    openBills();
    fireEvent.click(screen.getByRole('button', { name: 'View Juan Dela Cruz’s monthly SOA' }));
    expect(within(screen.getByRole('dialog')).getByText('November 2026 bill')).toBeInTheDocument();
  });
});

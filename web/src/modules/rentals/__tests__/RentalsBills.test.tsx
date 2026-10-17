import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { MeterReading, RentalBill, RentalProperty, RentalTenancy, RentalUnit, Renter } from '@himan/shared/rentals';
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
  bills: [] as RentalBill[], readings: [] as MeterReading[],
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
  state.run.mockResolvedValue({ issued: 1, failed: [] });
});
const openBills = () => {
  render(<MemoryRouter><RentalsPage /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Bills' }));
};
const row = (name: string) => within(screen.getByRole('listitem', { name: new RegExp(name) }));

describe('Bills view', () => {
  it('opens on the current month and moves between months', () => {
    openBills();
    expect(screen.getByRole('heading', { name: 'November 2026' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(screen.getByRole('heading', { name: 'October 2026' })).toBeInTheDocument();
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
    expect(row('Ana Reyes').getByText('Ready')).toBeInTheDocument();
    expect(row('Ana Reyes').getByText('₱3,500')).toBeInTheDocument();
    expect(row('Ben Lim').getByText('Covered by advance')).toBeInTheDocument();
    expect(row('Ben Lim').queryByRole('button', { name: /^Issue/ })).not.toBeInTheDocument();
  });
  it('lets a tenant be billed without utilities this month', () => {
    openBills();
    fireEvent.click(row('Juan Dela Cruz').getByRole('button', { name: 'Skip utilities this month' }));
    expect(row('Juan Dela Cruz').getByText('Ready')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Issue all ready (2)' })).toBeInTheDocument();
  });
  it('issues every ready bill at once', async () => {
    state.run.mockResolvedValue({ issued: 1, failed: [] });
    openBills();
    fireEvent.click(screen.getByRole('button', { name: 'Issue all ready (1)' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'issueBills', inputs: [{ tenancyId: 't2', kind: 'monthly',
      period: '2026-11', dueOn: '2026-11-15', lines: [{ kind: 'rent', label: 'Rent', amount: 350000, period: { from: '2026-11-15', to: '2026-12-14' } }] }] }));
    expect(toasts.success).toHaveBeenCalledWith('1 bill issued');
  });
  it('names the tenants whose bills failed', async () => {
    state.run.mockResolvedValue({ issued: 0, failed: ['t2'] });
    openBills();
    fireEvent.click(row('Ana Reyes').getByRole('button', { name: 'Issue' }));
    await waitFor(() => expect(toasts.warning).toHaveBeenCalledWith('Couldn’t issue the bill for Ana Reyes. Try again.'));
  });
  it('shows issued and cancelled bills by number', () => {
    state.bills = [issued('t1'), issued('t2', { id: 'void', status: 'void', number: 'LU-2026-0003' })];
    openBills();
    expect(row('Juan Dela Cruz').getByText('LU-2026-0002')).toBeInTheDocument();
    expect(row('Juan Dela Cruz').getByText('₱5,900')).toBeInTheDocument();
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
    expect(row('Ana Reyes').getAllByText('Ready').length).toBeGreaterThan(0);
  });
});

describe('Meter readings', () => {
  const input = () => screen.getByRole('spinbutton', { name: 'Room 1 electricity reading' });
  it('shows the last reading and the usage as you type', () => {
    openBills();
    expect(screen.getByText('Room 1 · Electricity')).toBeInTheDocument();
    expect(screen.getByText(/1,200 · Oct 15/)).toBeInTheDocument();
    fireEvent.change(input(), { target: { value: '1350' } });
    expect(screen.getByText('150 kWh = ₱2,400')).toBeInTheDocument();
  });
  it('refuses a lower reading unless the meter was reset', async () => {
    openBills();
    fireEvent.change(input(), { target: { value: '1100' } });
    expect(screen.getByText('Lower than the last reading (1,200). Tick “Meter was reset or replaced” if it was.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save readings' }));
    expect(state.run).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Meter was reset or replaced' }));
    state.run.mockResolvedValue([]);
    fireEvent.click(screen.getByRole('button', { name: 'Save readings' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'saveReadings', propertyId: 'p',
      inputs: [{ unitId: U1, kind: 'electric', readOn: '2026-11-10', value: 1100, isReset: true }] }));
  });
  it('saves only the filled readings with the chosen date', async () => {
    state.run.mockResolvedValue([]);
    openBills();
    fireEvent.change(input(), { target: { value: '1350' } });
    fireEvent.change(screen.getByLabelText('Reading date'), { target: { value: '2026-11-09' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save readings' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'saveReadings', propertyId: 'p',
      inputs: [{ unitId: U1, kind: 'electric', readOn: '2026-11-09', value: 1350, isReset: false }] }));
    expect(toasts.success).toHaveBeenCalledWith('Readings saved');
  });
  it('is read-only for a viewer', () => {
    state.properties = [{ ...property, role: 'viewer' }];
    openBills();
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Issue/ })).not.toBeInTheDocument();
  });
});

describe('Statement and bill sheet', () => {
  const openJuanBill = (bill = issued('t1')) => {
    state.bills = [bill];
    openBills();
    fireEvent.click(row('Juan Dela Cruz').getByRole('button', { name: /Juan Dela Cruz/ }));
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
    fireEvent.click(sheet.getByRole('button', { name: 'Edit bill' }));
    fireEvent.change(sheet.getByRole('textbox', { name: 'Rent (Nov 15 – Dec 14) amount' }), { target: { value: '3,000' } });
    fireEvent.click(sheet.getByRole('button', { name: 'Add other charge' }));
    fireEvent.change(sheet.getByRole('textbox', { name: 'Other charge name' }), { target: { value: 'Discount' } });
    fireEvent.change(sheet.getByRole('textbox', { name: 'Other charge amount' }), { target: { value: '-500' } });
    fireEvent.click(sheet.getByRole('button', { name: 'Save bill' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'updateBillLines', id: 'b-t1', lines: [
      { ...issued('t1').lines[0], amount: 300000 }, issued('t1').lines[1], { kind: 'other', label: 'Discount', amount: -50000 }] }));
  });
  it('keeps meter lines read-only while editing', () => {
    const sheet = openJuanBill();
    fireEvent.click(sheet.getByRole('button', { name: 'Edit bill' }));
    expect(sheet.queryByRole('textbox', { name: 'Electricity amount' })).not.toBeInTheDocument();
  });
  it('cancels a bill after confirming', async () => {
    state.run.mockResolvedValue(undefined);
    const sheet = openJuanBill();
    fireEvent.click(sheet.getByRole('button', { name: 'Cancel bill' }));
    expect(screen.getByText('Cancel LU-2026-0002?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel this bill' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'voidBill', id: 'b-t1', reason: '' }));
  });
  it('shows a cancelled bill without actions', () => {
    state.bills = [issued('t1', { status: 'void' })];
    openBills();
    fireEvent.click(screen.getByRole('button', { name: /Monthly bill LU-2026-0002/ }));
    const sheet = within(screen.getByRole('dialog'));
    expect(sheet.getAllByText('Cancelled').length).toBeGreaterThan(0);
    expect(sheet.queryByRole('button', { name: 'Edit bill' })).not.toBeInTheDocument();
    expect(sheet.queryByRole('button', { name: 'Cancel bill' })).not.toBeInTheDocument();
  });
  it('previews a ready bill and issues it', async () => {
    openBills();
    fireEvent.click(row('Ana Reyes').getByRole('button', { name: /Ana Reyes/ }));
    const sheet = within(screen.getByRole('dialog'));
    expect(sheet.getByText('Not issued yet')).toBeInTheDocument();
    fireEvent.click(sheet.getByRole('button', { name: 'Issue this bill' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith(expect.objectContaining({ type: 'issueBills' })));
  });
  it('lets a viewer only copy', () => {
    state.properties = [{ ...property, role: 'viewer' }];
    const sheet = openJuanBill();
    expect(sheet.getByRole('button', { name: 'Copy for Messenger' })).toBeInTheDocument();
    expect(sheet.queryByRole('button', { name: 'Edit bill' })).not.toBeInTheDocument();
    expect(sheet.queryByRole('button', { name: 'Cancel bill' })).not.toBeInTheDocument();
  });
});

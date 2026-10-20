import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DEFAULT_CLAUSES } from '@himan/shared/rentals';
import type { Clause, ContractText, RentalBill, RentalPayment, RentalProperty, RentalTenancy, RentalUnit, Renter } from '@himan/shared/rentals';
import { RentalsPage } from '../presentation/pages/RentalsPage';

/** Document order; happy-dom's compareDocumentPosition is wrong for nodes React inserted before a sibling. */
const precedes = (a: Element, b: Element) => { const all = [...document.querySelectorAll('*')]; return all.indexOf(a) < all.indexOf(b); };
/** A failed submit focuses the field, marks it invalid and shows the message under it, before (never after) the buttons. */
function expectFieldError(id: string, message: string, button: HTMLElement) {
  const field = document.getElementById(id);
  expect(document.activeElement).toBe(field);
  expect(field).toHaveAttribute('aria-invalid', 'true');
  expect(field).toHaveAttribute('aria-describedby', `${id}-error`);
  const error = document.getElementById(`${id}-error`)!;
  expect(error).toHaveTextContent(message);
  expect(precedes(error, button)).toBe(true);
}
/** The label shows the hidden `*` and the input itself is required. */
function expectRequired(id: string) {
  expect(document.querySelector(`label[for="${id}"] span[aria-hidden="true"]`)).toHaveTextContent('*');
  const field = document.getElementById(id)!;
  expect(field.hasAttribute('required') || field.getAttribute('aria-required') === 'true').toBe(true);
}

const unit = (id: string, name: string): RentalUnit => ({ id, propertyId: 'p', name, kind: 'room', capacity: 1, electricMode: 'none',
  electricAmountCentavos: 0, waterMode: 'none', waterAmountCentavos: 0, defaultRentCentavos: 350000, extraPersonRentCentavos: 0 });
const property: RentalProperty = {
  // Every detail the default contract prints is filled in, so creating a contract goes straight to the editor.
  id: 'p', createdBy: 'owner', name: 'Bakilid House', address: '12 Bakilid Road, Mandaue City', ownerName: '', ownerAddress: '', lessorName: 'Maria Santos',
  lessorCivilStatus: 'married', lessorAddress: 'Cebu City', lessorCapacity: 'owner', signingCity: 'Mandaue City', invoicePrefix: 'INV', lateFeeCentavos: 0, rentDueDay: null,
  paymentsTrackedFrom: null, lessorSignature: null, archivedAt: null, createdAt: '', updatedAt: '', role: 'owner',
  units: [unit('u1', 'Room A'), unit('u2', 'Room B')],
};
const person = (id: string, fullName: string): Renter => ({ id, propertyId: 'p', fullName, phone: '0917', facebook: '', email: '',
  address: '', emergencyName: '', emergencyPhone: '', occupants: 1, notes: '', files: [] });
const stay = (id: string, unitId: string, renterId: string, moveOut: string | null = null): RentalTenancy => ({
  id, propertyId: 'p', unitId, renterId, moveIn: '2026-10-10', moveOut, charges: [],
  contracts: [{ id: `c-${id}`, tenancyId: id, startDate: '2026-10-10', endDate: '2027-10-10', monthlyRentCentavos: 350000, dueDay: 10,
    advanceMonths: 1, depositCentavos: 350000, status: moveOut ? 'ended' : 'active' }] });
const moveInBill = (tenancyId: string): RentalBill => ({ id: `b-${tenancyId}`, propertyId: 'p', tenancyId, kind: 'move_in', period: '2026-10',
  number: 'INV-2026-0009', issuedOn: '2026-10-10', dueOn: '2026-10-10', status: 'issued', voidReason: '',
  lines: [{ kind: 'advance', label: 'Advance · 1 month', amount: 350000 }, { kind: 'deposit', label: 'Deposit', amount: 350000 }] });
const paid = (id: string, tenancyId: string, amount: number, reference = ''): RentalPayment => ({ id, propertyId: 'p', tenancyId,
  amountCentavos: amount, paidOn: '2026-10-10', method: 'gcash', reference, notes: '', status: 'active', voidReason: '', createdAt: '2026-10-10T02:00:00Z',
  proofs: [], allocations: [{ id: `a-${id}`, paymentId: id, billId: `b-${tenancyId}`, amountCentavos: amount, pinned: true }], receipt: {} });

const state = vi.hoisted(() => ({
  properties: [] as RentalProperty[], renters: [] as Renter[], tenancies: [] as RentalTenancy[], bills: [] as RentalBill[], readings: [],
  utilityBills: [], payments: [] as RentalPayment[], accounts: [], settlements: [], contractTexts: [] as ContractText[], links: [],
  templates: {} as Record<string, Clause[]>, online: true, userId: 'owner', myName: 'Maria Santos', loading: false, error: null, busy: false,
  run: vi.fn(), refetch: vi.fn(), fileUrl: vi.fn(), listMembers: vi.fn(async () => []), listFriends: vi.fn(async () => []),
}));
vi.mock('../presentation/hooks/useRentals', () => ({ useRentals: () => state }));
const toasts = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn() }));
vi.mock('sonner', () => ({ toast: toasts }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-10T02:00:00Z'));
  state.properties = [property];
  state.renters = [person('r3', 'Carlo Lim'), person('r4', 'Dina Past')];
  state.tenancies = [stay('t3', 'u2', 'r3'), stay('t4', 'u1', 'r4', '2026-01-01')];
  state.bills = [];
  state.payments = [paid('old', 't3', 100000, 'GC-123')];
  state.contractTexts = [];
  state.templates = { p: DEFAULT_CLAUSES };
  // The move-in adds the tenant, their bill and payment in place, as the refetch after it would.
  state.run.mockImplementation(async (a: { type: string; renterId?: string | null; payment?: { amountCentavos: number } | null }) => {
    if (a.type !== 'moveIn') return undefined;
    const renterId = a.renterId ?? 'r9';
    if (!a.renterId) state.renters.push(person('r9', 'Elle Tan'));
    state.tenancies.push(stay('t9', 'u1', renterId));
    state.bills.push(moveInBill('t9'));
    if (a.payment) state.payments.push(paid('pay9', 't9', a.payment.amountCentavos));
    return { renterId, tenancyId: 't9', billId: 'b-t9', paymentId: a.payment ? 'pay9' : null, warnings: [] };
  });
});

const openAdd = () => {
  render(<MemoryRouter><RentalsPage /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Rooms' }));
  fireEvent.click(within(screen.getByRole('region', { name: 'Room A' })).getByRole('button', { name: 'Add tenant' }));
};
const toPay = (name = 'Elle Tan') => {
  openAdd();
  fireEvent.change(screen.getByLabelText(/^Full name/), { target: { value: name } });
  fireEvent.click(screen.getByRole('button', { name: 'Next: payment' }));
};
const steps = () => within(screen.getByRole('list', { name: 'Move-in steps' })).getAllByRole('listitem');
const current = () => steps().find((s) => s.getAttribute('aria-current') === 'step')?.textContent;

describe('Move-in flow', () => {
  it('starts at Add tenant with the three steps shown, without the old details-link choice', () => {
    openAdd();
    expect(steps().map((s) => s.textContent)).toEqual(['1Add tenant', '2Pay', '3Contract']);
    expect(current()).toBe('1Add tenant');
    expect(screen.queryByRole('checkbox', { name: /Send details link/ })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Move in' })).toBeNull();
    // Step 1's due day and lease end aren't the contract document of step 3, so they aren't called "Contract".
    const dialog = within(screen.getByRole('dialog'));
    expect(dialog.getByText('Due date and lease end')).toBeInTheDocument();
    expect(dialog.getAllByText('Contract')).toHaveLength(1);
  });

  it('saves nothing at step 1 and shows the move-in bill to pay at step 2 (contact details optional)', () => {
    toPay();
    expect(state.run).not.toHaveBeenCalled();
    expect(current()).toMatch(/Pay/);
    expect(steps()[0]).toHaveTextContent('(done)');
    const bill = within(screen.getByRole('region', { name: 'Move-in bill' }));
    expect(bill.getByText('Advance · 1 month').nextElementSibling).toHaveTextContent('₱3,500.00');
    expect(bill.getByText('Deposit').nextElementSibling).toHaveTextContent('₱3,500.00');
    expect(bill.getByText('Total').nextElementSibling).toHaveTextContent('₱7,000.00');
    expect(screen.getByLabelText(/^Amount/)).toHaveValue('7000.00');
  });

  it('charges the days before the first due date, like the database', () => {
    openAdd();
    fireEvent.change(screen.getByLabelText(/^Full name/), { target: { value: 'Elle Tan' } });
    fireEvent.change(screen.getByLabelText(/^Move-in date/), { target: { value: '2026-10-15' } });
    fireEvent.change(screen.getByLabelText('Due day'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next: payment' }));
    const bill = within(screen.getByRole('region', { name: 'Move-in bill' }));
    expect(bill.getByText('Rent for 21 days').nextElementSibling).toHaveTextContent('₱2,450.00');
    expect(bill.getByText('Total').nextElementSibling).toHaveTextContent('₱9,450.00');
  });

  it('still checks step 1 before going on', async () => {
    openAdd();
    const next = screen.getByRole('button', { name: 'Next: payment' });
    fireEvent.click(next);
    expectFieldError('add-fullName', 'Enter the tenant’s name', next);
    expect(current()).toBe('1Add tenant');
    fireEvent.change(screen.getByLabelText(/^Full name/), { target: { value: 'Elle' } });
    expect(document.getElementById('add-fullName-error')).toBeNull();
    expect(document.getElementById('add-fullName')).not.toHaveAttribute('aria-invalid');
  });

  it('records a partial payment and adds the tenant in one go, then offers the receipt and the contract', async () => {
    toPay();
    fireEvent.change(screen.getByLabelText(/^Amount/), { target: { value: '5,000' } });
    fireEvent.change(screen.getByLabelText(/^How they paid/), { target: { value: 'cash' } });
    fireEvent.click(screen.getByRole('button', { name: 'Record payment and add tenant' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith(expect.objectContaining({ type: 'moveIn', propertyId: 'p', unitId: 'u1', renterId: null,
      renter: expect.objectContaining({ fullName: 'Elle Tan', phone: '' }), moveIn: '2026-10-10',
      payment: { amountCentavos: 500000, paidOn: '2026-10-10', method: 'cash', reference: '', notes: '' }, proofs: [] })));
    expect(state.run).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('Tenant added')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View receipt' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next: contract' }));
    expect(current()).toMatch(/Contract/);
    expect(steps()[1]).toHaveTextContent('(done)');
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeInTheDocument();
  });

  it('adds the tenant without a payment (pay later)', async () => {
    toPay();
    fireEvent.click(screen.getByRole('button', { name: 'Add without payment (pay later)' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith(expect.objectContaining({ type: 'moveIn', payment: null })));
    expect(await screen.findByText('Tenant added')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'View receipt' })).toBeNull();
  });

  it('moves in someone already on file', async () => {
    openAdd();
    fireEvent.click(screen.getByRole('button', { name: 'Already a tenant' }));
    fireEvent.change(screen.getByLabelText('Tenant'), { target: { value: 'r4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Next: payment' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add without payment (pay later)' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith(expect.objectContaining({ type: 'moveIn', renterId: 'r4', renter: null })));
  });

  it('marks amount, date and method as required and points at a bad payment field', async () => {
    toPay();
    ['pay-amount', 'pay-date', 'pay-method'].forEach(expectRequired);
    expect(document.querySelector('label[for="pay-reference"] span[aria-hidden="true"]')).toBeNull();
    const submit = screen.getByRole('button', { name: 'Record payment and add tenant' });
    fireEvent.change(screen.getByLabelText(/^Amount/), { target: { value: 'lots' } });
    fireEvent.click(submit);
    await waitFor(() => expectFieldError('pay-amount', 'Enter an amount like 10,000 or 1,500.50', submit));
    fireEvent.change(screen.getByLabelText(/^Amount/), { target: { value: '5,000' } });
    expect(document.getElementById('pay-amount-error')).toBeNull();
    fireEvent.change(screen.getByLabelText(/^Date paid/), { target: { value: '2026-12-01' } });
    fireEvent.click(submit);
    await waitFor(() => expectFieldError('pay-date', 'The payment date can’t be in the future', submit));
    expect(screen.queryByRole('alert')).toBeNull();
    expect(state.run).not.toHaveBeenCalled();
  });

  it('warns about a reference no. already used', () => {
    toPay();
    fireEvent.change(screen.getByLabelText(/Reference no/), { target: { value: 'gc-123' } });
    expect(screen.getByRole('status')).toHaveTextContent('already used');
  });

  it('shows a failed move-in in plain words and stays on Pay', async () => {
    state.run.mockRejectedValue(new Error('This room is full. Move someone out first, or add a bed.'));
    toPay();
    fireEvent.click(screen.getByRole('button', { name: 'Record payment and add tenant' }));
    const banner = await screen.findByRole('alert');
    expect(banner).toHaveTextContent('This room is full');
    expect(banner).toHaveAttribute('data-form-error');
    // At the top of the form, above the fields and the buttons.
    expect(precedes(banner, screen.getByLabelText(/^Amount/))).toBe(true);
    expect(current()).toMatch(/Pay/);
  });

  it('asks before throwing away a move-in that isn’t saved yet', async () => {
    toPay();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    expect(await screen.findByText('Discard this move-in?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Keep going' }));
    expect(screen.getByRole('region', { name: 'Move-in bill' })).toBeInTheDocument();
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    fireEvent.click(await screen.findByRole('button', { name: 'Discard' }));
    await waitFor(() => expect(screen.queryByRole('list', { name: 'Move-in steps' })).toBeNull());
    expect(state.run).not.toHaveBeenCalled();
  });

  it('closes after saving without asking, and the contract can wait', async () => {
    toPay();
    fireEvent.click(screen.getByRole('button', { name: 'Add without payment (pay later)' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Next: contract' }));
    fireEvent.click(screen.getByRole('button', { name: 'Do the contract later' }));
    await waitFor(() => expect(screen.queryByRole('list', { name: 'Move-in steps' })).toBeNull());
    expect(screen.queryByText('Discard this move-in?')).toBeNull();
  });

  it('offers signing on this device once the contract draft is saved', async () => {
    state.run.mockImplementation(async (a: { type: string; signMode?: 'esign' }) => {
      if (a.type === 'moveIn') {
        state.renters.push(person('r9', 'Elle Tan'));
        state.tenancies.push(stay('t9', 'u1', 'r9'));
        return { renterId: 'r9', tenancyId: 't9', billId: null, paymentId: null, warnings: [] };
      }
      if (a.type === 'createContractText') {
        state.contractTexts.push({ id: 'ct9', propertyId: 'p', contractId: 'c-t9', body: ['{{lessee_name}}'], specialTerms: '', status: 'draft',
          signMode: a.signMode ?? null, contentHash: null, tenantName: null, tenantSignature: null, tenantSignedAt: null, lessorSignedAt: null,
          lessorSignature: null, notarizedScanPath: null, createdAt: '', updatedAt: '', signedInPerson: false, witnessedBy: null });
        return 'ct9';
      }
      return undefined;
    });
    toPay();
    fireEvent.click(screen.getByRole('button', { name: 'Add without payment (pay later)' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Next: contract' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith(expect.objectContaining({ type: 'createContractText', contractId: 'c-t9' })));
    fireEvent.click(await screen.findByRole('button', { name: 'Sign on this device' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'sendContract', id: 'ct9' }));
    expect(await screen.findByText('Hand the phone to Elle Tan')).toBeInTheDocument();
  });
});

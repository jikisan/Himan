import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { RentalBill, RentalPayment, RentalProperty, RentalSettlement, RentalTenancy, Renter } from '@himan/shared/rentals';
import { RentalsPage } from '../presentation/pages/RentalsPage';

const U1 = '00000000-0000-0000-0000-000000000001';
const property: RentalProperty = {
  id: 'p', createdBy: 'owner', name: 'Lahug Units', address: '', ownerName: 'Maria Santos', ownerAddress: 'Lahug, Cebu City',
  lessorName: '', lessorCivilStatus: '', lessorAddress: '', lessorCapacity: 'owner', signingCity: '', invoicePrefix: 'LU',
  lateFeeCentavos: 0, rentDueDay: null, paymentsTrackedFrom: null, archivedAt: null, createdAt: '', updatedAt: '', role: 'owner',
  units: [{ id: U1, propertyId: 'p', name: 'Room 1', kind: 'room', capacity: 1, electricMode: 'none', electricAmountCentavos: 0,
    waterMode: 'none', waterAmountCentavos: 0, defaultRentCentavos: 0, extraPersonRentCentavos: 0 }],
};
const juan: Renter = { id: 'r1', propertyId: 'p', fullName: 'Juan Dela Cruz', phone: '0917', facebook: '', email: '',
  address: '', emergencyName: '', emergencyPhone: '', occupants: 1, notes: '', files: [] };
const tenancy: RentalTenancy = { id: 't1', propertyId: 'p', unitId: U1, renterId: 'r1', moveIn: '2026-10-15', moveOut: '2026-11-05', charges: [],
  contracts: [{ id: 'c1', tenancyId: 't1', startDate: '2026-10-15', endDate: '2027-10-15', monthlyRentCentavos: 350000,
    dueDay: 15, advanceMonths: 1, depositCentavos: 1000000, status: 'ended' }] };
const moveIn: RentalBill = { id: 'mi', propertyId: 'p', tenancyId: 't1', kind: 'move_in', period: '2026-10', number: 'LU-2026-0001',
  issuedOn: '2026-10-15', dueOn: '2026-10-15', status: 'issued', voidReason: '',
  lines: [{ kind: 'advance', label: 'Advance', amount: 350000 }, { kind: 'deposit', label: 'Deposit', amount: 1000000 }] };
const finalBill: RentalBill = { ...moveIn, id: 'fb', kind: 'final', period: '2026-11', number: 'LU-2026-0002', issuedOn: '2026-11-05',
  dueOn: '2026-11-05', lines: [{ kind: 'rent', label: 'Rent', amount: 200000 }] };
const paid: RentalPayment = { id: 'x', propertyId: 'p', tenancyId: 't1', amountCentavos: 1350000, paidOn: '2026-10-15', method: 'cash',
  reference: '', notes: '', status: 'active', voidReason: '', createdAt: '', proofs: [],
  allocations: [{ id: 'a', paymentId: 'x', billId: 'mi', amountCentavos: 1350000, pinned: false }] };
const settled: RentalSettlement = { id: 's1', propertyId: 'p', tenancyId: 't1', depositCentavos: 1000000, unpaidBillsCentavos: 200000,
  lines: [{ label: 'Cleaning', amount: 50000 }], forfeit: false, refundCentavos: 750000, owedCentavos: 0, refundedOn: '2026-11-10',
  refundMethod: 'gcash', refundReference: 'GC-9', notes: '', status: 'settled', settledAt: '2026-11-10T02:00:00Z',
  proofs: [{ id: 'pr1', settlementId: 's1', propertyId: 'p', name: 'refund.png', mimeType: 'image/png', size: 1, storagePath: 'x', ready: true }] };

const state = vi.hoisted(() => ({
  properties: [] as RentalProperty[], renters: [] as Renter[], tenancies: [] as RentalTenancy[], bills: [] as RentalBill[], readings: [],
  utilityBills: [], payments: [] as RentalPayment[], accounts: [], settlements: [] as RentalSettlement[],
  online: true, userId: 'owner', myName: 'Maria Santos', loading: false, error: null, busy: false,
  run: vi.fn(), refetch: vi.fn(), fileUrl: vi.fn(), paymentProofUrl: vi.fn(), settlementProofUrl: vi.fn(), qrUrl: vi.fn(),
  listMembers: vi.fn(async () => []), listFriends: vi.fn(async () => []), contractTexts: [], links: [], templates: {},
}));
vi.mock('../presentation/hooks/useRentals', () => ({ useRentals: () => state }));
const toasts = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn() }));
vi.mock('sonner', () => ({ toast: toasts }));
const pdfs = vi.hoisted(() => ({ downloadSettlementPdf: vi.fn() }));
vi.mock('../presentation/pdf/download', () => pdfs);

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-10T02:00:00Z'));
  state.properties = [property];
  state.renters = [juan];
  state.tenancies = [tenancy];
  state.bills = [moveIn, finalBill];
  state.payments = [paid];
  state.settlements = [];
  state.run.mockResolvedValue({ id: 's1', failed: [] });
});
const page = () => render(<MemoryRouter><RentalsPage /></MemoryRouter>);

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
const openFromHome = () => {
  page();
  fireEvent.click(screen.getByRole('button', { name: 'Settle Juan Dela Cruz’s deposit' }));
  return within(screen.getByRole('dialog', { name: /Settle deposit/ }));
};
const openTenant = () => {
  page();
  fireEvent.click(screen.getByRole('button', { name: 'Tenants' }));
  fireEvent.click(screen.getByRole('checkbox', { name: 'Show past tenants' }));
  fireEvent.click(screen.getByRole('button', { name: /Juan Dela Cruz/ }));
  return within(screen.getByRole('dialog'));
};

describe('Home', () => {
  it('lists the deposit to return with the tenant, room and amount, and counts it as held', () => {
    page();
    const todo = within(screen.getByRole('region', { name: /To do/ }));
    expect(todo.getByText('Deposit to return')).toBeInTheDocument();
    expect(todo.getByText('Juan Dela Cruz · Room 1 · ₱10,000')).toBeInTheDocument();
    expect(screen.getByText('Deposits held').nextElementSibling).toHaveTextContent('₱10,000');
  });
  it('drops the to-do and the held deposit once settled', () => {
    state.settlements = [settled];
    page();
    expect(screen.queryByText('Deposit to return')).not.toBeInTheDocument();
    expect(screen.getByText('Deposits held').nextElementSibling).toHaveTextContent('₱0');
  });
  it('shows no to-do to viewers', () => {
    state.properties = [{ ...property, role: 'viewer' }];
    page();
    expect(screen.queryByText('Deposit to return')).not.toBeInTheDocument();
  });
});

describe('Settling a deposit', () => {
  it('takes unpaid bills and each line off the deposit, then saves after a confirm', async () => {
    const dialog = openFromHome();
    expect(dialog.getByText('Deposit held').nextElementSibling).toHaveTextContent('₱10,000');
    expect(dialog.getByText(/Unpaid bills/).closest('div')).toHaveTextContent('₱2,000');
    expect(dialog.getByText(/recomputed when you save/)).toBeInTheDocument();
    fireEvent.click(dialog.getByRole('button', { name: 'Add Cleaning' }));
    fireEvent.change(dialog.getByRole('textbox', { name: 'Amount for Cleaning' }), { target: { value: '500' } });
    expect(dialog.getByText('Refund to tenant').nextElementSibling).toHaveTextContent('₱7,500');
    expect(dialog.getByLabelText(/^Refund date/)).toHaveValue('2026-11-10');
    ['settle-date', 'settle-method'].forEach(expectRequired);
    fireEvent.change(dialog.getByRole('combobox', { name: 'How you refunded' }), { target: { value: 'bank' } });
    fireEvent.change(dialog.getByRole('textbox', { name: 'Reference no.' }), { target: { value: 'BDO-1' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Save settlement' }));
    expect(state.run).not.toHaveBeenCalled();
    expect(dialog.getByText(/This can’t be undone here/)).toBeInTheDocument();
    fireEvent.click(dialog.getByRole('button', { name: 'Yes, settle deposit' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'settleDeposit', tenancyId: 't1', proofs: [], input: {
      lines: [{ label: 'Cleaning', amount: 50000 }], forfeit: false, refundedOn: '2026-11-10', refundMethod: 'bank', refundReference: 'BDO-1', notes: '' } }));
    expect(toasts.success).toHaveBeenCalledWith('Deposit settled');
  });

  it('keeps the whole deposit on early termination with no refund form', async () => {
    const dialog = openFromHome();
    fireEvent.click(dialog.getByRole('checkbox', { name: 'Keep the whole deposit (early termination)' }));
    expect(dialog.getByText('Refund to tenant').nextElementSibling).toHaveTextContent('₱0');
    expect(dialog.queryByLabelText(/^Refund date/)).not.toBeInTheDocument();
    fireEvent.click(dialog.getByRole('button', { name: 'Save settlement' }));
    fireEvent.click(dialog.getByRole('button', { name: 'Yes, settle deposit' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith(expect.objectContaining({ input: expect.objectContaining({
      forfeit: true, refundedOn: null, refundMethod: null }) })));
  });

  it('points at a refund date in the future', () => {
    const dialog = openFromHome();
    fireEvent.change(dialog.getByLabelText(/^Refund date/), { target: { value: '2026-12-01' } });
    const save = dialog.getByRole('button', { name: 'Save settlement' });
    fireEvent.click(save);
    expectFieldError('settle-date', 'The refund date can’t be in the future', save);
    expect(state.run).not.toHaveBeenCalled();
  });

  it('shows what the tenant still owes when deductions exceed the deposit', () => {
    const dialog = openFromHome();
    fireEvent.click(dialog.getByRole('button', { name: 'Add Damage' }));
    fireEvent.change(dialog.getByRole('textbox', { name: 'Amount for Damage' }), { target: { value: '9,000' } });
    expect(dialog.getByText('Tenant still owes').nextElementSibling).toHaveTextContent('₱1,000');
    expect(dialog.queryByLabelText(/^Refund date/)).not.toBeInTheDocument();
  });

  it('adds the tenant credit to the refund', () => {
    state.payments = [{ ...paid, amountCentavos: 1380000 }];
    const dialog = openFromHome();
    expect(dialog.getByText('Tenant credit').nextElementSibling).toHaveTextContent('₱300');
    expect(dialog.getByText('Refund to tenant').nextElementSibling).toHaveTextContent('₱8,300');
  });

  it('shows no credit row without credit', () => {
    expect(openFromHome().queryByText('Tenant credit')).not.toBeInTheDocument();
  });

  it('asks for a label on each line and shows the database’s message as is', async () => {
    const dialog = openFromHome();
    fireEvent.click(dialog.getByRole('button', { name: 'Add Other' }));
    fireEvent.change(dialog.getByRole('textbox', { name: 'Label for Other' }), { target: { value: '' } });
    const label = dialog.getByRole('textbox', { name: 'Label for Other' });
    expect(label).toBeRequired();
    const save = dialog.getByRole('button', { name: 'Save settlement' });
    fireEvent.click(save);
    expectFieldError(label.id, 'Add a label and an amount for each deduction', save);
    expect(dialog.queryByRole('alert')).toBeNull();
    fireEvent.change(label, { target: { value: 'Key' } });
    expect(document.getElementById(`${label.id}-error`)).toBeNull();
    fireEvent.click(dialog.getByRole('button', { name: /Remove/ }));
    state.run.mockRejectedValue(new Error('This deposit is already settled'));
    fireEvent.click(dialog.getByRole('button', { name: 'Save settlement' }));
    fireEvent.click(dialog.getByRole('button', { name: 'Yes, settle deposit' }));
    await waitFor(() => expect(dialog.getByRole('alert')).toHaveTextContent('This deposit is already settled'));
    expect(precedes(dialog.getByRole('alert'), dialog.getByText('Deposit held'))).toBe(true);
  });
});

describe('Settled deposit', () => {
  it('shows the stored figures, proofs and the PDF to managers', async () => {
    state.settlements = [settled];
    state.settlementProofUrl.mockResolvedValue('https://signed/pr1');
    const tab = { opener: {}, location: { replace: vi.fn() }, close: vi.fn() };
    vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);
    const sheet = openTenant();
    expect(sheet.queryByRole('button', { name: /Settle deposit/ })).not.toBeInTheDocument();
    fireEvent.click(sheet.getByRole('button', { name: 'View settlement' }));
    const dialog = within(screen.getByRole('dialog', { name: /Deposit settled/ }));
    expect(dialog.getByText('Refund to tenant').nextElementSibling).toHaveTextContent('₱7,500');
    expect(dialog.getByText(/GCash · Nov 10, 2026 · Ref GC-9/)).toBeInTheDocument();
    fireEvent.click(dialog.getByRole('button', { name: 'View refund.png' }));
    await waitFor(() => expect(tab.location.replace).toHaveBeenCalledWith('https://signed/pr1'));
    fireEvent.click(dialog.getByRole('button', { name: 'Settlement PDF' }));
    await waitFor(() => expect(pdfs.downloadSettlementPdf).toHaveBeenCalledWith(settled, expect.objectContaining({
      renterName: 'Juan Dela Cruz', roomName: 'Room 1', moveOut: '2026-11-05', ownerName: 'Maria Santos' })));
  });

  it('drops the leftover credit from the sheet and says what a kept deposit still leaves owed', () => {
    state.payments = [{ ...paid, amountCentavos: 1380000 }];
    state.settlements = [{ ...settled, refundCentavos: 0, owedCentavos: 120000, refundedOn: null, refundMethod: null, refundReference: '' }];
    const sheet = openTenant();
    expect(sheet.queryByText(/credit$/)).not.toBeInTheDocument();
    expect(sheet.getByText('Settled · deposit kept · still owes ₱1,200')).toBeInTheDocument();
  });

  it('lets managers settle from the sheet and shows viewers the summary read-only', () => {
    let sheet = openTenant();
    expect(sheet.getByRole('button', { name: 'Settle deposit' })).toBeInTheDocument();
    cleanup();
    state.properties = [{ ...property, role: 'viewer' }];
    state.settlements = [{ ...settled, proofs: [] }];
    sheet = openTenant();
    expect(sheet.queryByRole('button', { name: 'Settle deposit' })).not.toBeInTheDocument();
    fireEvent.click(sheet.getByRole('button', { name: 'View settlement' }));
    const dialog = within(screen.getByRole('dialog', { name: /Deposit settled/ }));
    expect(dialog.getByText('Refund to tenant').nextElementSibling).toHaveTextContent('₱7,500');
    expect(dialog.queryByText(/Proof/)).not.toBeInTheDocument();
    expect(dialog.getByRole('button', { name: 'Settlement PDF' })).toBeInTheDocument();
  });
});

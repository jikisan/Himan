import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { MeterReading, PaymentAccount, RentalBill, RentalPayment, RentalProperty, RentalTenancy, Renter, UtilityBill } from '@himan/shared/rentals';
import { RentalsPage } from '../presentation/pages/RentalsPage';
import { BillStateBadge } from '../presentation/components/Badges';

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
const tenancy: RentalTenancy = { id: 't1', propertyId: 'p', unitId: U1, renterId: 'r1', moveIn: '2026-10-15', moveOut: null, charges: [],
  contracts: [{ id: 'c1', tenancyId: 't1', startDate: '2026-10-15', endDate: '2027-10-15', monthlyRentCentavos: 350000,
    dueDay: 15, advanceMonths: 1, depositCentavos: 350000, status: 'active' }] };
const BILL = '00000000-0000-0000-0000-0000000000b1';
const bill = (extra: Partial<RentalBill> = {}): RentalBill => ({ id: BILL, propertyId: 'p', tenancyId: 't1', kind: 'monthly', period: '2026-11',
  number: 'LU-2026-0002', issuedOn: '2026-11-01', dueOn: '2026-11-15', status: 'issued', voidReason: '',
  lines: [{ kind: 'rent', label: 'Rent', amount: 350000, period: { from: '2026-11-15', to: '2026-12-14' } }], ...extra });
const moveIn = (): RentalBill => bill({ id: 'mi', kind: 'move_in', number: 'LU-2026-0001', period: '2026-10', issuedOn: '2026-10-15', dueOn: '2026-10-15',
  lines: [{ kind: 'advance', label: 'Advance', amount: 350000 }, { kind: 'deposit', label: 'Deposit', amount: 350000 }] });
const pay = (id: string, amount: number, allocs: [string, number][], extra: Partial<RentalPayment> = {}): RentalPayment => ({
  id, propertyId: 'p', tenancyId: 't1', amountCentavos: amount, paidOn: '2026-11-05', method: 'gcash', reference: 'GC-123',
  notes: '', status: 'active', voidReason: '', createdAt: '2026-11-05T01:00:00Z', proofs: [],
  allocations: allocs.map(([billId, amountCentavos], i) => ({ id: `${id}-a${i}`, paymentId: id, billId, amountCentavos, pinned: false })), ...extra });
const gcash: PaymentAccount = { id: 'acc1', propertyId: 'p', kind: 'gcash', label: 'GCash', accountName: 'Maria Santos',
  accountNumber: '0917 555 1234', qrPath: null, position: 0 };

const state = vi.hoisted(() => ({
  properties: [] as RentalProperty[], renters: [] as Renter[], tenancies: [] as RentalTenancy[],
  bills: [] as RentalBill[], readings: [] as MeterReading[], utilityBills: [] as UtilityBill[],
  payments: [] as RentalPayment[], accounts: [] as PaymentAccount[], settlements: [],
  online: true, userId: 'owner', myName: 'Maria Santos', loading: false, error: null, busy: false,
  run: vi.fn(), refetch: vi.fn(), fileUrl: vi.fn(), paymentProofUrl: vi.fn(), qrUrl: vi.fn((path: string) => `https://cdn/${path}`),
  listMembers: vi.fn(async () => []), listFriends: vi.fn(async () => []), contractTexts: [], links: [], templates: {},
}));
vi.mock('../presentation/hooks/useRentals', () => ({ useRentals: () => state }));
const toasts = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn() }));
vi.mock('sonner', () => ({ toast: toasts }));
const pdfs = vi.hoisted(() => ({ downloadBillPdf: vi.fn(), downloadReceiptPdf: vi.fn() }));
vi.mock('../presentation/pdf/download', () => pdfs);

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-10T02:00:00Z'));
  state.properties = [property];
  state.renters = [juan];
  state.tenancies = [tenancy];
  state.bills = [bill()];
  state.payments = [];
  state.accounts = [];
  state.run.mockResolvedValue({ id: 'new', failed: [] });
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
const openBill = () => {
  page();
  fireEvent.click(screen.getByRole('button', { name: 'Bills' }));
  fireEvent.click(screen.getByRole('button', { name: 'View Juan Dela Cruz’s monthly SOA' }));
  return within(screen.getByRole('dialog'));
};
const openTenant = () => {
  page();
  fireEvent.click(screen.getByRole('button', { name: 'Tenants' }));
  fireEvent.click(screen.getByRole('button', { name: /Juan Dela Cruz/ }));
  return within(screen.getByRole('dialog'));
};
const recordDialog = () => within(screen.getByRole('dialog', { name: /Record payment/ }));

describe('Bill state badge', () => {
  const badge = (b: RentalBill, payments: RentalPayment[]) => {
    const { container } = render(<BillStateBadge bill={b} payments={payments} today="2026-11-10" />);
    return container.textContent;
  };
  it('shows Unpaid, Partial with what is left, Paid and Overdue', () => {
    expect(badge(bill(), [])).toBe('Unpaid');
    expect(badge(bill(), [pay('x', 100000, [[BILL, 100000]])])).toBe('Partial · ₱2,500 left');
    expect(badge(bill(), [pay('x', 350000, [[BILL, 350000]])])).toBe('Paid');
    expect(badge(bill({ dueOn: '2026-11-03' }), [])).toBe('Overdue · 7 days');
    expect(badge(bill({ dueOn: '2026-11-03' }), [pay('x', 100000, [[BILL, 100000]])])).toBe('Overdue · ₱2,500 left');
  });
});

describe('Recording a payment', () => {
  it('pre-fills what the tenant owes and records it against this bill', async () => {
    const sheet = openBill();
    fireEvent.click(sheet.getByRole('button', { name: 'Record payment' }));
    const dialog = recordDialog();
    expect(dialog.getByRole('textbox', { name: 'Amount' })).toHaveValue('3500.00');
    expect(dialog.getByLabelText(/^Date paid/)).toHaveValue('2026-11-10');
    fireEvent.change(dialog.getByRole('combobox', { name: 'How they paid' }), { target: { value: 'cash' } });
    fireEvent.change(dialog.getByRole('textbox', { name: 'Reference no.' }), { target: { value: 'OR-9' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Save payment' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'recordPayment', tenancyId: 't1', proofs: [],
      input: { amountCentavos: 350000, paidOn: '2026-11-10', method: 'cash', reference: 'OR-9', notes: '', billId: BILL } }));
    expect(toasts.success).toHaveBeenCalledWith('Payment recorded');
  });
  it('points at a zero amount, then shows a refusal at the top', async () => {
    const sheet = openBill();
    fireEvent.click(sheet.getByRole('button', { name: 'Record payment' }));
    const dialog = recordDialog();
    ['pay-amount', 'pay-date', 'pay-method'].forEach(expectRequired);
    const save = dialog.getByRole('button', { name: 'Save payment' });
    fireEvent.change(dialog.getByRole('textbox', { name: 'Amount' }), { target: { value: '0' } });
    fireEvent.click(save);
    await waitFor(() => expectFieldError('pay-amount', 'Amount must be more than zero', save));
    expect(dialog.queryByRole('alert')).toBeNull();
    expect(state.run).not.toHaveBeenCalled();
    fireEvent.change(dialog.getByRole('textbox', { name: 'Amount' }), { target: { value: '100' } });
    expect(document.getElementById('pay-amount-error')).toBeNull();
    state.run.mockRejectedValue(new Error('This bill is cancelled'));
    fireEvent.click(save);
    const banner = await dialog.findByRole('alert');
    expect(banner).toHaveTextContent('This bill is cancelled');
    expect(precedes(banner, dialog.getByRole('textbox', { name: 'Amount' }))).toBe(true);
  });
  it('warns when the reference number was used before', () => {
    state.payments = [pay('old', 50000, [[BILL, 50000]], { reference: 'GC-123' })];
    const sheet = openBill();
    fireEvent.click(sheet.getByRole('button', { name: 'Record payment' }));
    const dialog = recordDialog();
    expect(dialog.getByRole('textbox', { name: 'Amount' })).toHaveValue('3000.00');
    fireEvent.change(dialog.getByRole('textbox', { name: 'Reference no.' }), { target: { value: ' gc-123 ' } });
    expect(dialog.getByText(/already used on a ₱500 payment from Juan Dela Cruz/)).toBeInTheDocument();
  });
  it('shows a tenant’s credit on their sheet', () => {
    state.payments = [pay('over', 400000, [[BILL, 350000]])];
    expect(openTenant().getByText('₱500 credit')).toBeInTheDocument();
  });
  it('records from the tenant sheet, oldest bill first', async () => {
    const sheet = openTenant();
    fireEvent.click(sheet.getByRole('button', { name: 'Record payment' }));
    const dialog = recordDialog();
    expect(dialog.getByRole('combobox', { name: 'Pay this bill first' })).toHaveValue('');
    fireEvent.change(dialog.getByRole('textbox', { name: 'Amount' }), { target: { value: '1,000' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Save payment' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith(expect.objectContaining({ type: 'recordPayment',
      input: expect.objectContaining({ amountCentavos: 100000, billId: null }) })));
  });
});

describe('Payments list', () => {
  it('voids a payment only with a reason', async () => {
    state.payments = [pay('p1', 350000, [[BILL, 350000]])];
    state.run.mockResolvedValue(undefined);
    const sheet = openBill();
    fireEvent.click(sheet.getByRole('button', { name: /^Void payment of ₱3,500/ }));
    const dialog = within(screen.getByRole('dialog', { name: 'Void this payment?' }));
    expectRequired('void-reason');
    const submit = dialog.getByRole('button', { name: 'Void payment' });
    fireEvent.click(submit);
    expectFieldError('void-reason', 'Say why you’re voiding this payment', submit);
    expect(dialog.queryByRole('alert')).toBeNull();
    expect(state.run).not.toHaveBeenCalled();
    fireEvent.change(dialog.getByRole('textbox', { name: 'Reason' }), { target: { value: 'Bounced transfer' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Void payment' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'voidPayment', id: 'p1', reason: 'Bounced transfer' }));
  });
  it('shows a refused void at the top of its form', async () => {
    state.payments = [pay('p1', 350000, [[BILL, 350000]])];
    state.run.mockRejectedValue(new Error('Already voided'));
    const sheet = openBill();
    fireEvent.click(sheet.getByRole('button', { name: /^Void payment of ₱3,500/ }));
    const dialog = within(screen.getByRole('dialog', { name: 'Void this payment?' }));
    fireEvent.change(dialog.getByRole('textbox', { name: 'Reason' }), { target: { value: 'Bounced' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Void payment' }));
    const banner = await dialog.findByRole('alert');
    expect(banner).toHaveTextContent('Already voided');
    expect(precedes(banner, dialog.getByRole('textbox', { name: 'Reason' }))).toBe(true);
  });
  it('asks before editing or cancelling a paid bill, and says the extra goes back to credit', async () => {
    state.payments = [pay('p1', 100000, [[BILL, 100000]])];
    const sheet = openBill();
    expect(sheet.queryByText(/void the payment first/i)).not.toBeInTheDocument();
    fireEvent.click(sheet.getByRole('button', { name: 'Edit SOA' }));
    const edit = within(screen.getByRole('alertdialog'));
    expect(edit.getByText('₱1,000 was already paid on this bill. If it goes down, the extra goes back to the tenant’s credit.')).toBeInTheDocument();
    fireEvent.click(edit.getByRole('button', { name: 'Edit SOA' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Save SOA' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel SOA' }));
    expect(within(screen.getByRole('alertdialog')).getByText(/₱1,000 was already paid on this bill/)).toBeInTheDocument();
  });
  it('offers no edit, cancel or late fee on a bill the deposit settlement counted', () => {
    state.properties = [{ ...property, lateFeeCentavos: 50000 }];
    state.bills = [bill({ dueOn: '2026-11-03', settled: true })];
    const sheet = openBill();
    expect(sheet.getByText('Settled with the deposit, so this SOA can’t be changed.')).toBeInTheDocument();
    for (const name of ['Edit SOA', 'Cancel SOA', /^Add late fee/]) expect(sheet.queryByRole('button', { name })).not.toBeInTheDocument();
  });
  it('edits an unpaid bill without asking', () => {
    const sheet = openBill();
    fireEvent.click(sheet.getByRole('button', { name: 'Edit SOA' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save SOA' })).toBeInTheDocument();
  });
  it('adds a late fee to a part-paid overdue bill without asking', async () => {
    state.properties = [{ ...property, lateFeeCentavos: 50000 }];
    state.bills = [bill({ dueOn: '2026-11-03' })];
    state.payments = [pay('p1', 100000, [[BILL, 100000]])];
    state.run.mockResolvedValue(undefined);
    const sheet = openBill();
    fireEvent.click(sheet.getByRole('button', { name: 'Add late fee ₱500' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith(expect.objectContaining({ type: 'updateBillLines', id: BILL })));
  });
  it('opens a proof through a short-lived link', async () => {
    state.payments = [pay('p1', 350000, [[BILL, 350000]], { proofs: [{ id: 'pr1', paymentId: 'p1', propertyId: 'p', name: 'gcash.png',
      mimeType: 'image/png', size: 2048, storagePath: 'p/payments/p1/pr1', ready: true }] })];
    state.paymentProofUrl.mockResolvedValue('https://signed/pr1');
    const tab = { opener: {}, location: { replace: vi.fn() }, close: vi.fn() };
    vi.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);
    const sheet = openBill();
    fireEvent.click(sheet.getByRole('button', { name: 'View gcash.png' }));
    await waitFor(() => expect(tab.location.replace).toHaveBeenCalledWith('https://signed/pr1'));
    expect(state.paymentProofUrl).toHaveBeenCalledWith('pr1');
  });
  it('shows a viewer the payments but no record, void or proof controls', () => {
    state.properties = [{ ...property, role: 'viewer' }];
    state.payments = [pay('p1', 100000, [[BILL, 100000]])];
    const sheet = openBill();
    expect(sheet.getByText('Partial · ₱2,500 left')).toBeInTheDocument();
    expect(sheet.getByText(/GC-123/)).toBeInTheDocument();
    expect(sheet.queryByRole('button', { name: 'Record payment' })).not.toBeInTheDocument();
    expect(sheet.queryByRole('button', { name: /^Void/ })).not.toBeInTheDocument();
    expect(sheet.queryByText(/Proof/)).not.toBeInTheDocument();
  });
});

describe('Home', () => {
  it('lists overdue bills and the deposits held', () => {
    state.bills = [moveIn(), bill({ dueOn: '2026-11-03' })];
    state.payments = [pay('p1', 700000, [['mi', 700000]])];
    page();
    const overdue = within(screen.getByRole('region', { name: 'Overdue' }));
    expect(overdue.getByText('Juan Dela Cruz')).toBeInTheDocument();
    expect(overdue.getByText(/₱3,500 left · 7 days late/)).toBeInTheDocument();
    expect(screen.getByText('Deposits held').nextElementSibling).toHaveTextContent('₱3,500');
  });
  it('shows a deposit as pending until the move-in bill is paid', () => {
    state.bills = [moveIn()];
    page();
    expect(screen.getByText('Deposits held').nextElementSibling).toHaveTextContent('₱0');
    expect(screen.getByText('₱3,500 pending')).toBeInTheDocument();
  });
});

describe('Bills from before payment tracking', () => {
  const earlier = () => {
    state.properties = [{ ...property, paymentsTrackedFrom: '2026-11-08' }];
    state.bills = [bill({ issuedOn: '2026-10-20', dueOn: '2026-11-03' })];
  };
  it('lists them in a banner instead of Overdue and marks them all paid after asking', async () => {
    earlier();
    state.run.mockResolvedValue(1);
    page();
    expect(screen.queryByRole('region', { name: 'Overdue' })).not.toBeInTheDocument();
    const banner = within(screen.getByRole('region', { name: 'Bills from before payment tracking' }));
    expect(banner.getByText(/1 tenant · ₱3,500/)).toBeInTheDocument();
    fireEvent.click(banner.getByRole('button', { name: 'Mark all as paid' }));
    const confirm = within(screen.getByRole('alertdialog'));
    expect(confirm.getByText(/open a tenant and record what was actually paid/)).toBeInTheDocument();
    expect(state.run).not.toHaveBeenCalled();
    fireEvent.click(confirm.getByRole('button', { name: 'Mark all as paid' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'markEarlierPaid', propertyId: 'p' }));
  });
  it('keeps the bill’s honest badge and hides the banner from viewers', () => {
    earlier();
    state.properties = [{ ...state.properties[0], role: 'viewer' }];
    page();
    expect(screen.queryByRole('region', { name: 'Bills from before payment tracking' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Bills' }));
    fireEvent.click(screen.getByRole('button', { name: 'View Juan Dela Cruz’s monthly SOA' }));
    expect(within(screen.getByRole('dialog')).getByText('Overdue · 7 days')).toBeInTheDocument();
  });
  it('shows no banner once they are paid', () => {
    earlier();
    state.payments = [pay('p1', 350000, [[BILL, 350000]])];
    page();
    expect(screen.queryByRole('region', { name: 'Bills from before payment tracking' })).not.toBeInTheDocument();
  });
});

describe('Payment accounts', () => {
  it('lets the owner add an account in Edit property', async () => {
    state.run.mockResolvedValue('acc-new');
    page();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Edit property' }));
    fireEvent.click(dialog.getByRole('button', { name: 'Add payment account' }));
    fireEvent.change(dialog.getByRole('textbox', { name: 'Account name' }), { target: { value: 'Maria Santos' } });
    fireEvent.change(dialog.getByRole('textbox', { name: 'Account number' }), { target: { value: '0917 555 1234' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Save account' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'saveAccount', propertyId: 'p', id: null,
      input: { kind: 'gcash', label: 'GCash', accountName: 'Maria Santos', accountNumber: '0917 555 1234', position: 0 } }));
  });
  it('shows a saved QR and is hidden from managers', () => {
    state.accounts = [{ ...gcash, qrPath: 'p/acc1-1.png' }];
    const { unmount } = page();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.getByRole('img', { name: 'GCash QR code' })).toHaveAttribute('src', 'https://cdn/p/acc1-1.png');
    unmount();
    state.properties = [{ ...property, role: 'manager' }];
    page();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
  });
  it('puts the accounts, previous balance and paid amount on the bill and its Messenger copy', async () => {
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    state.accounts = [gcash];
    state.bills = [bill({ id: 'oct', number: 'LU-2026-0001', period: '2026-10', dueOn: '2026-10-15' }), bill()];
    state.payments = [pay('p1', 150000, [['oct', 150000]]), pay('p2', 50000, [[BILL, 50000]], { reference: 'GC-2' })];
    const sheet = openBill();
    expect(sheet.getByText('Pay to')).toBeInTheDocument();
    expect(sheet.getByText('Previous balance').nextElementSibling).toHaveTextContent('₱2,000');
    expect(sheet.getByText('Amount due now').nextElementSibling).toHaveTextContent('₱5,000');
    expect(sheet.queryByText('Paid in full')).not.toBeInTheDocument();
    fireEvent.click(sheet.getByRole('button', { name: 'Copy for Messenger' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Pay to:\nGCash — Maria Santos 0917 555 1234')));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Previous balance ₱2,000'));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Paid ₱500'));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Amount due now ₱5,000'));
  });
});

describe('PDF downloads', () => {
  it('downloads the bill with its accounts and QR images, disabled while it is made', async () => {
    state.accounts = [gcash];
    let finish = () => {};
    pdfs.downloadBillPdf.mockReturnValue(new Promise<void>((resolve) => { finish = resolve; }));
    const sheet = openBill();
    fireEvent.click(sheet.getByRole('button', { name: 'Download PDF' }));
    await waitFor(() => expect(pdfs.downloadBillPdf).toHaveBeenCalledWith(expect.objectContaining({ id: BILL, number: 'LU-2026-0002' }),
      expect.objectContaining({ renterName: 'Juan Dela Cruz', roomName: 'Room 1', accounts: [gcash] }), state.qrUrl));
    expect(sheet.getByRole('button', { name: 'Download PDF' })).toBeDisabled();
    finish();
    await waitFor(() => expect(sheet.getByRole('button', { name: 'Download PDF' })).toBeEnabled());
  });
  it('blames the connection only when the PDF code couldn’t be loaded', async () => {
    pdfs.downloadBillPdf.mockRejectedValue(new TypeError('Failed to fetch dynamically imported module'));
    fireEvent.click(openBill().getByRole('button', { name: 'Download PDF' }));
    await waitFor(() => expect(toasts.error).toHaveBeenCalledWith('Couldn’t make the PDF. Check your connection and try again.'));
  });
  it.each([new Error('Bad image'), new TypeError('Cannot read properties of undefined')])('says so plainly when the PDF can’t be made (%s)', async (error) => {
    pdfs.downloadBillPdf.mockRejectedValue(error);
    fireEvent.click(openBill().getByRole('button', { name: 'Download PDF' }));
    await waitFor(() => expect(toasts.error).toHaveBeenCalledWith('Couldn’t make the PDF. Try again.'));
  });
  it('downloads a receipt for each active payment, for viewers too', async () => {
    state.properties = [{ ...property, role: 'viewer' }];
    const p1 = pay('p1', 350000, [[BILL, 350000]]);
    state.payments = [p1, pay('p2', 1000, [], { status: 'void', voidReason: 'Typo' })];
    const sheet = openTenant();
    expect(sheet.getAllByRole('button', { name: /Receipt PDF/ })).toHaveLength(1);
    fireEvent.click(sheet.getByRole('button', { name: 'Receipt PDF for ₱3,500 on Nov 5, 2026' }));
    await waitFor(() => expect(pdfs.downloadReceiptPdf).toHaveBeenCalledWith(p1, expect.objectContaining({
      renterName: 'Juan Dela Cruz', roomName: 'Room 1', ownerName: 'Maria Santos', bills: state.bills, payments: state.payments })));
  });
  it('opens a payment as the paper receipt, for viewers too, with its download', async () => {
    state.properties = [{ ...property, role: 'viewer' }];
    const p1 = pay('p1', 350000, [[BILL, 350000]]);
    state.payments = [p1];
    const sheet = openTenant();
    fireEvent.click(sheet.getByRole('button', { name: 'View receipt for ₱3,500 on Nov 5, 2026' }));
    const dialog = within(await screen.findByRole('dialog'));
    const paper = within(dialog.getByRole('article', { name: 'Acknowledgment Receipt' }));
    expect(paper.getByText('Juan Dela Cruz')).toBeInTheDocument();
    expect(paper.getByText('Three Thousand Five Hundred Pesos Only')).toBeInTheDocument();
    fireEvent.click(dialog.getByRole('button', { name: 'Download PDF' }));
    await waitFor(() => expect(pdfs.downloadReceiptPdf).toHaveBeenCalledWith(p1, expect.objectContaining({ renterName: 'Juan Dela Cruz' })));
  });
});

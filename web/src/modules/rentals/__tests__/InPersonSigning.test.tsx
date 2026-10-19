import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DEFAULT_CLAUSES, canonicalText, sha256Hex } from '@himan/shared/rentals';
import type { Clause, ContractText, RentalBill, RentalPayment, RentalProperty, RentalTenancy, RentalUnit, Renter } from '@himan/shared/rentals';
import { RentalsPage } from '../presentation/pages/RentalsPage';

const pad = vi.hoisted(() => ({ instance: null as null | { fire(): void } }));
vi.mock('signature_pad', () => ({
  default: class {
    private listener: (() => void) | null = null;
    constructor() { pad.instance = this as never; }
    addEventListener(_: string, fn: () => void) { this.listener = fn; }
    fire() { this.listener?.(); }
    toDataURL() { return PNG; }
    clear() {}
    off() {}
    on() {}
    toData() { return []; }
    fromData() {}
  },
}));

const PNG = 'data:image/png;base64,AAAA';
const unit: RentalUnit = { id: 'u2', propertyId: 'p', name: 'Room B', kind: 'room', capacity: 1, electricMode: 'none', electricAmountCentavos: 0,
  waterMode: 'none', waterAmountCentavos: 0, defaultRentCentavos: 350000, extraPersonRentCentavos: 0 };
const property: RentalProperty = {
  id: 'p', createdBy: 'owner', name: 'Bakilid House', address: '', ownerName: '', ownerAddress: '', lessorName: 'Maria Santos',
  lessorCivilStatus: '', lessorAddress: '', lessorCapacity: 'owner', signingCity: '', invoicePrefix: 'INV', lateFeeCentavos: 0, rentDueDay: null,
  paymentsTrackedFrom: null, lessorSignature: PNG, archivedAt: null, createdAt: '', updatedAt: '', role: 'owner', units: [unit],
};
const carlo: Renter = { id: 'r3', propertyId: 'p', fullName: 'Carlo Lim', phone: '0917', facebook: '', email: '', address: '',
  emergencyName: '', emergencyPhone: '', occupants: 1, notes: '', files: [] };
const tenancy: RentalTenancy = { id: 't3', propertyId: 'p', unitId: 'u2', renterId: 'r3', moveIn: '2026-10-01', moveOut: null, charges: [],
  contracts: [{ id: 'c-t3', tenancyId: 't3', startDate: '2026-10-01', endDate: '2027-10-01', monthlyRentCentavos: 350000, dueDay: 1,
    advanceMonths: 1, depositCentavos: 350000, status: 'active' }] };
const BODY = ['{{lessee_name}} of {{lessee_address}}', '1. Lease.'];
const text = (extra: Partial<ContractText> = {}): ContractText => ({ id: 'ct', propertyId: 'p', contractId: 'c-t3', body: BODY, specialTerms: '',
  status: 'sent', signMode: 'esign', contentHash: null, tenantName: null, tenantSignature: null, tenantSignedAt: null, lessorSignedAt: null,
  lessorSignature: null, notarizedScanPath: null, createdAt: '', updatedAt: '', signedInPerson: false, witnessedBy: null, ...extra });
const moveInBill: RentalBill = { id: 'b1', propertyId: 'p', tenancyId: 't3', kind: 'move_in', period: '2026-10', number: 'INV-2026-0001',
  issuedOn: '2026-10-01', dueOn: '2026-10-01', status: 'issued', voidReason: '', lines: [{ kind: 'advance', label: 'Advance', amount: 350000 }] };
const paidAll: RentalPayment = { id: 'pay', propertyId: 'p', tenancyId: 't3', amountCentavos: 350000, paidOn: '2026-10-01', method: 'cash', reference: '',
  notes: '', status: 'active', voidReason: '', createdAt: '', proofs: [], allocations: [{ id: 'a', paymentId: 'pay', billId: 'b1', amountCentavos: 350000, pinned: false }] };

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
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ scale: vi.fn(), drawImage: vi.fn() } as never);
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-10T02:00:00Z'));
  state.properties = [property];
  state.renters = [carlo];
  state.tenancies = [tenancy];
  state.bills = [moveInBill];
  state.payments = [];
  state.contractTexts = [text()];
  state.templates = { p: DEFAULT_CLAUSES };
  state.run.mockImplementation(async (a: { type: string }) => (a.type === 'signInPerson' ? { failed: [] } : undefined));
});

const openSheet = () => {
  render(<MemoryRouter><RentalsPage /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Rooms' }));
  fireEvent.click(within(screen.getByRole('region', { name: 'Room B' })).getByRole('button', { name: /^Carlo Lim/ }));
};
// The tenant screen is the topmost dialog, over the tenant sheet.
const top = () => within(screen.getAllByRole('dialog').at(-1)!);
const fill = (label: string | RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const toDetails = () => {
  openSheet();
  fireEvent.click(screen.getByRole('button', { name: 'Sign on this device' }));
  const intro = within(screen.getByRole('dialog', { name: 'Hand the phone to Carlo Lim' }));
  expect(intro.getByText(/Signing: Sign online only/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Start' }));
};
const fillDetails = (id = new File(['x'], 'id.png', { type: 'image/png' })) => {
  fill('Home address', 'Pajo, Lapu-Lapu City');
  fill('Emergency contact name', 'Rosa Lim');
  fill('Emergency contact number', '0918');
  fireEvent.change(top().getByLabelText(/Valid ID/), { target: { files: [id] } });
  fireEvent.click(screen.getByRole('checkbox', { name: /stores these details/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Next: read the contract' }));
};

describe('Sign on this device', () => {
  it('lets the tenant fill in their details, read their own contract and sign it, then the owner countersigns', async () => {
    toDetails();
    expect(screen.getByLabelText('Full name')).toHaveValue('Carlo Lim');
    fillDetails();
    const paper = within(screen.getByRole('article', { name: 'Contract of Lease' }));
    expect(paper.getByText('Carlo Lim of Pajo, Lapu-Lapu City')).toBeInTheDocument();
    fill('Type your full name', 'Carlo Lim');
    act(() => pad.instance!.fire());
    fireEvent.click(screen.getByRole('button', { name: 'Sign' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith(expect.objectContaining({ type: 'signInPerson' })));
    expect(state.run).toHaveBeenCalledWith({ type: 'signInPerson', id: 'ct', renterId: 'r3', propertyId: 'p', name: 'Carlo Lim', signature: PNG,
      contentHash: await sha256Hex(canonicalText(['Carlo Lim of Pajo, Lapu-Lapu City', '1. Lease.'], '')),
      details: { fullName: 'Carlo Lim', phone: '0917', address: 'Pajo, Lapu-Lapu City', emergencyName: 'Rosa Lim', emergencyPhone: '0918',
        facebook: '', email: '', occupants: 1 },
      ids: [{ name: 'id.png', mimeType: 'image/png', bytes: expect.any(ArrayBuffer) }] });
    expect(await screen.findByText(/give the phone back to Maria Santos/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'I’m the owner: countersign' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sign with my saved signature' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'countersign', id: 'ct' }));
    expect(toasts.success).toHaveBeenCalledWith('Contract signed by both');
  });

  it('keeps the tenant screen open on a tap outside it or Escape, so nothing typed is lost', () => {
    toDetails();
    fill('Mobile number', '0917');
    fireEvent.pointerDown(document.body);
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    expect(screen.getByLabelText('Mobile number')).toHaveValue('0917');
  });

  it('uses the corrected name in the contract and the hash', async () => {
    toDetails();
    fill('Full name', 'Carlo M. Lim');
    fillDetails();
    expect(screen.getByText('Carlo M. Lim of Pajo, Lapu-Lapu City')).toBeInTheDocument();
    fill('Type your full name', 'Carlo M. Lim');
    act(() => pad.instance!.fire());
    fireEvent.click(screen.getByRole('button', { name: 'Sign' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith(expect.objectContaining({
      contentHash: expect.any(String), details: expect.objectContaining({ fullName: 'Carlo M. Lim' }) })));
    const call = state.run.mock.calls.find(([a]) => a.type === 'signInPerson')![0];
    expect(call.contentHash).toBe(await sha256Hex(canonicalText(['Carlo M. Lim of Pajo, Lapu-Lapu City', '1. Lease.'], '')));
  });

  it('asks for the missing details and an ID before showing the contract', () => {
    toDetails();
    fireEvent.click(screen.getByRole('button', { name: 'Next: read the contract' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Enter your home address');
    fill('Home address', 'Pajo');
    fill('Emergency contact name', 'Rosa Lim');
    fill('Emergency contact number', '0918');
    fireEvent.click(screen.getByRole('button', { name: 'Next: read the contract' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Add a photo of a valid ID');
    fireEvent.change(top().getByLabelText(/Valid ID/), { target: { files: [new File(['x'], 'id.gif', { type: 'image/gif' })] } });
    expect(screen.getByRole('alert')).toHaveTextContent('PDF, JPEG, or PNG');
    expect(screen.queryByRole('article', { name: 'Contract of Lease' })).toBeNull();
  });

  it('warns when an ID photo didn’t upload after signing', async () => {
    state.run.mockImplementation(async (a: { type: string }) => (a.type === 'signInPerson' ? { failed: ['id.png'] } : undefined));
    toDetails();
    fillDetails();
    fill('Type your full name', 'Carlo Lim');
    act(() => pad.instance!.fire());
    fireEvent.click(screen.getByRole('button', { name: 'Sign' }));
    expect(await screen.findByText(/give the phone back/)).toBeInTheDocument();
    expect(toasts.warning).toHaveBeenCalledWith('Signed, but couldn’t attach id.png. Add it from their tenant sheet.');
  });

  it('shows a refusal in plain words and stays on the contract', async () => {
    state.run.mockRejectedValue(new Error('The contract changed. Reload the page to read the latest version'));
    toDetails();
    fillDetails();
    fill('Type your full name', 'Carlo Lim');
    act(() => pad.instance!.fire());
    fireEvent.click(screen.getByRole('button', { name: 'Sign' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('The contract changed');
    expect(screen.getByRole('article', { name: 'Contract of Lease' })).toBeInTheDocument();
  });

  it('is for managers only', () => {
    state.properties = [{ ...property, role: 'viewer' }];
    openSheet();
    expect(screen.queryByRole('button', { name: 'Sign on this device' })).toBeNull();
  });
});

describe('Move-in checklist on the tenant sheet', () => {
  const checklist = () => screen.queryByRole('region', { name: 'Move-in checklist' });
  it('shows what is left: unpaid move-in and the contract stage, for viewers too', () => {
    state.properties = [{ ...property, role: 'viewer' }];
    openSheet();
    expect(checklist()).toHaveTextContent('Added ✓ done');
    expect(checklist()).toHaveTextContent('Move-in paid ✗ not yet');
    expect(checklist()).toHaveTextContent('Contract ✗ not yet (waiting to sign)');
  });

  it('ticks the payment once the move-in bill is paid', () => {
    state.payments = [paidAll];
    state.contractTexts = [text({ status: 'signed' })];
    openSheet();
    expect(checklist()).toHaveTextContent('Move-in paid ✓ done');
    expect(checklist()).toHaveTextContent('(needs your signature)');
  });

  it('is gone when everything is done, or the contract isn’t needed', () => {
    state.payments = [paidAll];
    state.contractTexts = [text({ status: 'countersigned' })];
    const { unmount } = render(<MemoryRouter><RentalsPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Rooms' }));
    fireEvent.click(within(screen.getByRole('region', { name: 'Room B' })).getByRole('button', { name: /^Carlo Lim/ }));
    expect(checklist()).toBeNull();
    unmount();
    state.payments = [];
    state.contractTexts = [];
    state.tenancies = [{ ...tenancy, contractNotNeeded: true }];
    openSheet();
    expect(checklist()).toBeNull();
  });
});

describe('Contract written for in-person signing', () => {
  it('says signed in person on the tenant’s side of the paper copy', async () => {
    state.contractTexts = [text({ status: 'signed', signedInPerson: true, body: ['Carlo Lim of Pajo', '1. Lease.'], tenantName: 'Carlo Lim',
      tenantSignature: PNG, tenantSignedAt: '2026-10-09T02:00:00Z', contentHash: 'a'.repeat(64) })];
    openSheet();
    fireEvent.click(screen.getByRole('button', { name: 'View contract' }));
    expect(await screen.findByText('Signed in person on Oct 9, 2026')).toBeInTheDocument();
  });
});

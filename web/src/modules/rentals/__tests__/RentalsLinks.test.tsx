import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DEFAULT_CLAUSES, linkMessage } from '@himan/shared/rentals';
import type { ContractText, RentalBill, RentalProperty, RentalTenancy, RentalUnit, Renter, TenancyLink } from '@himan/shared/rentals';
import { RentalsPage } from '../presentation/pages/RentalsPage';
import { expectBanner, expectFieldError, expectNoErrorAfter, expectRequired } from './formErrors';

const unit = (id: string, propertyId: string, name: string): RentalUnit => ({ id, propertyId, name, kind: 'room', capacity: 1,
  electricMode: 'none', electricAmountCentavos: 0, waterMode: 'none', waterAmountCentavos: 0, defaultRentCentavos: 350000, extraPersonRentCentavos: 0 });
const home = (id: string, name: string, createdBy = 'owner', units: RentalUnit[] = []): RentalProperty => ({
  id, createdBy, name, address: '', ownerName: '', ownerAddress: '', lessorName: 'Maria Santos', lessorCivilStatus: '', lessorAddress: '',
  lessorCapacity: 'owner', signingCity: '', invoicePrefix: 'INV', lateFeeCentavos: 0, rentDueDay: null, paymentsTrackedFrom: null,
  lessorSignature: null, archivedAt: null, createdAt: '', updatedAt: '', role: 'owner', units });
const property = home('p', 'Bakilid House', 'owner', [unit('u1', 'p', 'Room A'), unit('u2', 'p', 'Room B')]);
const person = (id: string, propertyId: string, fullName: string, extra: Partial<Renter> = {}): Renter => ({ id, propertyId, fullName,
  phone: '0917', facebook: '', email: '', address: '', emergencyName: '', emergencyPhone: '', occupants: 1, notes: '', files: [], ...extra });
const stay = (id: string, propertyId: string, unitId: string, renterId: string, moveIn: string, endDate = '2027-03-01'): RentalTenancy => ({
  id, propertyId, unitId, renterId, moveIn, moveOut: null, charges: [],
  contracts: [{ id: `c-${id}`, tenancyId: id, startDate: moveIn, endDate, monthlyRentCentavos: 350000, dueDay: 30, advanceMonths: 1,
    depositCentavos: 350000, status: 'active' }] });
const details = { fullName: 'Carlo M. Lim', phone: '0917 111 2222', address: '5 Pajo, Lapu-Lapu City', emergencyName: 'Rosa Lim',
  emergencyPhone: '0918 333 4444', facebook: 'carlo.lim', email: 'carlo@example.com', occupants: 2, idPaths: ['tok-old/a.png', 'tok-old/b.pdf'] };
const link = (extra: Partial<TenancyLink> = {}): TenancyLink => ({ tenancyId: 't3', propertyId: 'p', token: 'tok-old', kind: 'existing',
  status: 'open', submittedDetails: null, submittedAt: null, acceptedAt: null, revokedAt: null, createdAt: '', ...extra });

const state = vi.hoisted(() => ({
  properties: [] as RentalProperty[], renters: [] as Renter[], tenancies: [] as RentalTenancy[], bills: [] as RentalBill[], readings: [],
  utilityBills: [], payments: [], accounts: [], settlements: [], contractTexts: [] as ContractText[], links: [] as TenancyLink[], templates: {},
  online: true, userId: 'owner', myName: 'Maria Santos', loading: false, error: null, busy: false,
  run: vi.fn(), refetch: vi.fn(), fileUrl: vi.fn(), listMembers: vi.fn(async () => []), listFriends: vi.fn(async () => []),
}));
vi.mock('../presentation/hooks/useRentals', () => ({ useRentals: () => state }));
const toasts = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn() }));
vi.mock('sonner', () => ({ toast: toasts }));
const writeText = vi.fn(async () => undefined);

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-10T02:00:00Z'));
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  state.properties = [property, home('q', 'Talamban House'), home('z', 'Friend’s Place', 'friend')];
  state.renters = [person('r3', 'p', 'Carlo Lim'),
    person('d-old', 'q', 'Dana Cruz', { phone: '0920' }),
    person('d-new', 'q', 'Dana Cruz', { phone: '0920', facebook: 'dana.fb', email: 'dana@example.com', address: 'Talamban, Cebu City',
      emergencyName: 'Mom', emergencyPhone: '0999', occupants: 2, notes: 'Private note', files: [{ id: 'f', name: 'ID.png' } as never] }),
    person('e', 'q', 'Eli Go'), person('zed', 'z', 'Zed Friend')];
  state.tenancies = [stay('t3', 'p', 'u2', 'r3', '2026-03-01'), stay('tq1', 'q', 'uq', 'd-old', '2025-01-01'),
    stay('tq2', 'q', 'uq', 'd-new', '2026-06-01'), stay('tq3', 'q', 'uq', 'e', '2026-02-01'), stay('tz', 'z', 'uz', 'zed', '2026-07-01')];
  state.links = [];
  state.contractTexts = [];
  state.bills = [];
  state.templates = { p: DEFAULT_CLAUSES };
  state.run.mockResolvedValue(undefined);
});

const page = (tab?: string) => {
  const view = render(<MemoryRouter><RentalsPage /></MemoryRouter>);
  if (tab) fireEvent.click(screen.getByRole('button', { name: tab }));
  return view;
};
const openAdd = () => { page('Rooms'); fireEvent.click(within(screen.getByRole('region', { name: 'Room A' })).getByRole('button', { name: 'Add tenant' })); };
const openSheet = () => {
  page('Rooms');
  fireEvent.click(within(screen.getByRole('region', { name: 'Room B' })).getByRole('button', { name: /^View Carlo Lim/ }));
};

describe('Waiting for details', () => {
  it('shows on the Tenants list, the Rooms board and the tenant sheet until submitted', () => {
    state.links = [link({ kind: 'new' })];
    const { unmount } = page('Tenants');
    expect(screen.getByText('Carlo Lim').closest('li')).toHaveTextContent('Waiting for details');
    fireEvent.click(screen.getByRole('button', { name: 'Rooms' }));
    expect(within(screen.getByRole('region', { name: 'Room B' })).getByText('Waiting for details')).toBeInTheDocument();
    unmount();
    state.links = [link({ kind: 'new', status: 'submitted', submittedDetails: details })];
    openSheet();
    expect(screen.getAllByText('Details to review').length).toBeGreaterThan(0);
    expect(screen.queryByText('Waiting for details')).not.toBeInTheDocument();
  });

  it('is not shown for an existing-tenant link', () => {
    state.links = [link()];
    page('Tenants');
    expect(screen.queryByText('Waiting for details')).not.toBeInTheDocument();
  });
});

describe('Pick from my other properties', () => {
  it('lists each person once, newest first, with the property, and copies contact details only', async () => {
    openAdd();
    fireEvent.click(screen.getByRole('button', { name: 'Already a tenant' }));
    const select = screen.getByLabelText('Tenant');
    const others = within(within(select).getByRole('group', { name: 'From my other properties' })).getAllByRole('option');
    expect(others.map((o) => o.textContent)).toEqual(['Dana Cruz · Talamban House', 'Eli Go · Talamban House']);
    expect(screen.queryByText(/Zed Friend/)).not.toBeInTheDocument();
    fireEvent.change(select, { target: { value: (others[0] as HTMLOptionElement).value } });
    expect(screen.getByText(/Ask for a new ID photo/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next: payment' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add without payment (pay later)' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith(expect.objectContaining({ type: 'moveIn', propertyId: 'p', renterId: null,
      renter: { fullName: 'Dana Cruz', phone: '0920', facebook: 'dana.fb', email: 'dana@example.com', address: 'Talamban, Cebu City',
        emergencyName: 'Mom', emergencyPhone: '0999', occupants: 2, notes: '' } })));
  });
});

describe('Review details', () => {
  beforeEach(() => { state.links = [link({ kind: 'new', status: 'submitted', submittedDetails: details, submittedAt: '2026-10-09T01:00:00Z' })]; });
  const review = () => within(screen.getByRole('region', { name: 'Details to review' }));

  it('shows what the tenant sent without the ID images, and accepts it', async () => {
    openSheet();
    const r = review();
    for (const value of ['Carlo M. Lim', '0917 111 2222', '5 Pajo, Lapu-Lapu City', 'Rosa Lim · 0918 333 4444', 'carlo.lim', 'carlo@example.com', '2 people'])
      expect(r.getByText(value)).toBeInTheDocument();
    expect(r.getByText('2 ID photos')).toBeInTheDocument();
    expect(r.queryByRole('img')).not.toBeInTheDocument();
    fireEvent.click(r.getByRole('button', { name: 'Accept' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'acceptDetails', tenancyId: 't3' }));
    expect(state.run).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'saveRenter' }));
  });

  it('shows a friendly error and lets Accept be tried again', async () => {
    state.run.mockRejectedValueOnce(new Error('Could not copy the ID files. Try Accept again.'));
    openSheet();
    fireEvent.click(review().getByRole('button', { name: 'Accept' }));
    expect(await review().findByRole('alert')).toHaveTextContent('Could not copy the ID files. Try Accept again.');
    expectBanner('Could not copy the ID files. Try Accept again.', review().getByText('Full name'));
    expectNoErrorAfter(review().getByRole('button', { name: 'Ask again' }));
    fireEvent.click(review().getByRole('button', { name: 'Accept' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledTimes(2));
  });

  it('asks the tenant again', async () => {
    openSheet();
    fireEvent.click(review().getByRole('button', { name: 'Ask again' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'reopenLink', tenancyId: 't3' }));
  });

  it('is a Home to-do that opens the tenant', () => {
    page();
    fireEvent.click(screen.getByRole('button', { name: 'Review details from Carlo Lim' }));
    expect(review().getByRole('button', { name: 'Accept' })).toBeInTheDocument();
  });

  it('is hidden from viewers', () => {
    state.properties = [{ ...property, role: 'viewer' }];
    openSheet();
    expect(screen.queryByRole('region', { name: 'Details to review' })).not.toBeInTheDocument();
    expect(screen.queryByText('carlo@example.com')).not.toBeInTheDocument();
  });
});

describe('Tenant link on the sheet', () => {
  beforeEach(() => { state.links = [link()]; });
  const panel = () => within(screen.getByRole('region', { name: 'Tenant link' }));

  it('copies the link message', async () => {
    openSheet();
    fireEvent.click(panel().getByRole('button', { name: 'Copy link' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(linkMessage(`${location.origin}/r/tok-old`, 'Carlo Lim', 'existing')));
  });

  it('makes a new link only after a confirm', async () => {
    openSheet();
    fireEvent.click(panel().getByRole('button', { name: 'Make a new link' }));
    expect(state.run).not.toHaveBeenCalled();
    expect(await screen.findByText(/old link stops working/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Make new link' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'createLink', tenancyId: 't3', kind: 'existing' }));
  });

  it('turns the link off only after a confirm', async () => {
    openSheet();
    fireEvent.click(panel().getByRole('button', { name: 'Turn off link' }));
    expect(state.run).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByRole('button', { name: 'Turn off' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'revokeLink', tenancyId: 't3' }));
  });

  it('offers a new link once the link is off', () => {
    state.links = [link({ revokedAt: '2026-10-01T00:00:00Z' })];
    openSheet();
    expect(panel().getByText('The link is off.')).toBeInTheDocument();
    expect(panel().queryByRole('button', { name: 'Copy link' })).not.toBeInTheDocument();
    expect(panel().getByRole('button', { name: 'Make a new link' })).toBeInTheDocument();
  });

  it('is hidden from viewers, and no token reaches the page', () => {
    state.properties = [{ ...property, role: 'viewer' }];
    const { container } = render(<MemoryRouter><RentalsPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Rooms' }));
    fireEvent.click(within(screen.getByRole('region', { name: 'Room B' })).getByRole('button', { name: /^View Carlo Lim/ }));
    expect(screen.queryByRole('region', { name: 'Tenant link' })).not.toBeInTheDocument();
    expect(container.ownerDocument.body.innerHTML).not.toContain('tok-old');
  });
});

describe('Contract ends soon', () => {
  it('is a Home to-do within 30 days that opens the tenant', () => {
    state.tenancies = [stay('t3', 'p', 'u2', 'r3', '2026-03-01', '2026-11-01')];
    page();
    expect(screen.getByText('Contract ends in 22 days')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open Carlo Lim’s contract' }));
    expect(screen.getByRole('region', { name: 'Contract' })).toBeInTheDocument();
  });

  it('is not shown for a contract ending later', () => {
    state.tenancies = [stay('t3', 'p', 'u2', 'r3', '2026-03-01', '2026-11-10')];
    page();
    expect(screen.queryByText(/^Contract ends in/)).not.toBeInTheDocument();
  });
});

describe('Renewals', () => {
  it('changes the rent without making contract text', async () => {
    state.bills = [{ id: 'b', tenancyId: 't3', propertyId: 'p', kind: 'monthly', status: 'issued', period: '2026-09', dueOn: '2026-09-30',
      number: 'INV-2026-0001', lines: [], lateFeeCentavos: 0 } as unknown as RentalBill];
    state.contractTexts = [{ id: 'ct-old', propertyId: 'p', contractId: 'c-t3', body: ['1. Old'], specialTerms: '', status: 'countersigned',
      signMode: 'esign', contentHash: 'h', tenantName: 'Carlo Lim', tenantSignature: null, tenantSignedAt: '2026-03-01T00:00:00Z',
      lessorSignedAt: '2026-03-01T00:00:00Z', lessorSignature: null, notarizedScanPath: null, createdAt: '', updatedAt: '' }];
    openSheet();
    fireEvent.click(screen.getByRole('button', { name: 'Change rent' }));
    fireEvent.change(screen.getByLabelText('New rent'), { target: { value: '4000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith(expect.objectContaining({ type: 'changeRent', contractId: 'c-t3' })));
    expect(state.run).toHaveBeenCalledTimes(1);
  });

  it('offers Create contract for the renewed contract and leaves the signed one untouched', () => {
    const renewed = stay('t3', 'p', 'u2', 'r3', '2026-03-01');
    renewed.contracts = [{ ...renewed.contracts[0], id: 'c-old', status: 'ended' },
      { ...renewed.contracts[0], id: 'c-new', startDate: '2026-11-01', monthlyRentCentavos: 400000 }];
    state.tenancies = [renewed];
    const signed: ContractText = { id: 'ct-old', propertyId: 'p', contractId: 'c-old', body: ['1. Old'], specialTerms: '', status: 'countersigned',
      signMode: 'esign', contentHash: 'h', tenantName: 'Carlo Lim', tenantSignature: null, tenantSignedAt: '2026-03-01T00:00:00Z',
      lessorSignedAt: '2026-03-01T00:00:00Z', lessorSignature: null, notarizedScanPath: null, createdAt: '', updatedAt: '' };
    state.contractTexts = [signed];
    openSheet();
    const contract = within(screen.getByRole('region', { name: 'Contract' }));
    expect(contract.getByRole('button', { name: 'Create contract' })).toBeInTheDocument();
    expect(state.run).not.toHaveBeenCalled();
    expect(state.contractTexts).toEqual([signed]);
    expect(signed.body).toEqual(['1. Old']);
  });
});

describe('Tenant sheet form errors', () => {
  const type = (id: string, value: string) => fireEvent.change(document.getElementById(id)!, { target: { value } });
  const openTerms = () => { openSheet(); fireEvent.click(screen.getByRole('button', { name: 'Change rent' })); };

  it('takes you to a bad due day in the rent form, with the message under it', () => {
    openTerms();
    expectRequired('terms-c-t3-rent');
    expectRequired('terms-c-t3-due');
    type('terms-c-t3-due', '32');
    const save = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(save);
    expectFieldError('terms-c-t3-due', 'Due day is 1–31');
    expectNoErrorAfter(save);
    type('terms-c-t3-rent', 'lots');
    fireEvent.click(save);
    expectFieldError('terms-c-t3-rent', 'Enter an amount like 10,000 or 1,500.50');
    expect(state.run).not.toHaveBeenCalled();
  });

  it('shows a refused rent change in one banner at the top of the rent form', async () => {
    state.run.mockRejectedValue(new Error('The database said no'));
    openTerms();
    type('terms-c-t3-rent', '4,000');
    const save = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(save);
    await waitFor(() => expectBanner('The database said no', document.getElementById('terms-c-t3-rent')!));
    expectNoErrorAfter(save);
  });

  it('points at the charge missing its name, and shows a refusal in a banner', async () => {
    openSheet();
    const charges = within(screen.getByRole('region', { name: 'Extra monthly charges' }));
    fireEvent.click(charges.getByRole('button', { name: 'Other' }));
    type('charges-t3-charge-0-amount', '500');
    const save = charges.getByRole('button', { name: 'Save charges' });
    fireEvent.click(save);
    expectFieldError('charges-t3-charge-0-name', 'Enter a name and amount for each charge');
    expectNoErrorAfter(save);
    type('charges-t3-charge-0-name', 'Parking');
    expect(document.getElementById('charges-t3-charge-0-name')).not.toHaveAttribute('aria-invalid');
    state.run.mockRejectedValue(new Error('The database said no'));
    fireEvent.click(save);
    await waitFor(() => expectBanner('The database said no', document.getElementById('charges-t3-charge-0-name')!));
    expectNoErrorAfter(save);
  });
});

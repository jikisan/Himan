import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DEFAULT_CLAUSES } from '@himan/shared/rentals';
import type { Clause, ContractText, RentalProperty, RentalTenancy, RentalUnit, Renter, TenancyLink } from '@himan/shared/rentals';
import { RentalsPage } from '../presentation/pages/RentalsPage';

// A written contract is optional but nudged everywhere: Home to-dos, the tenant sheet, the lists, and after Add tenant.
const unit = (n: number): RentalUnit => ({ id: `u${n}`, propertyId: 'p', name: `Room ${n}`, kind: 'room', capacity: 1, electricMode: 'none',
  electricAmountCentavos: 0, waterMode: 'none', waterAmountCentavos: 0, defaultRentCentavos: 350000, extraPersonRentCentavos: 0 });
const property: RentalProperty = {
  id: 'p', createdBy: 'owner', name: 'Bakilid House', address: '', ownerName: '', ownerAddress: '', lessorName: 'Maria Santos',
  lessorCivilStatus: '', lessorAddress: '', lessorCapacity: 'owner', signingCity: '', invoicePrefix: 'INV', lateFeeCentavos: 0, rentDueDay: null,
  paymentsTrackedFrom: null, lessorSignature: null, archivedAt: null, createdAt: '', updatedAt: '', role: 'owner',
  units: [1, 2, 3, 4, 5, 6, 7].map(unit),
};
const person = (id: string, fullName: string): Renter => ({ id, propertyId: 'p', fullName, phone: '0917', facebook: '', email: '', address: '',
  emergencyName: '', emergencyPhone: '', occupants: 1, notes: '', files: [] });
const stay = (id: string, unitId: string, renterId: string, extra: Partial<RentalTenancy> = {}): RentalTenancy => ({
  id, propertyId: 'p', unitId, renterId, moveIn: '2026-03-01', moveOut: null, charges: [],
  contracts: [{ id: `c-${id}`, tenancyId: id, startDate: '2026-03-01', endDate: '2027-03-01', monthlyRentCentavos: 350000, dueDay: 30,
    advanceMonths: 1, depositCentavos: 350000, status: extra.moveOut ? 'ended' : 'active' }], ...extra });
const text = (tenancyId: string, status: ContractText['status']): ContractText => ({ id: `x-${tenancyId}`, propertyId: 'p', contractId: `c-${tenancyId}`,
  body: ['1. Clause'], specialTerms: '', status, signMode: 'esign', contentHash: null, tenantName: null, tenantSignature: null,
  tenantSignedAt: null, lessorSignedAt: null, lessorSignature: null, notarizedScanPath: null, createdAt: '', updatedAt: '' });

const state = vi.hoisted(() => ({
  properties: [] as RentalProperty[], renters: [] as Renter[], tenancies: [] as RentalTenancy[], bills: [], readings: [], utilityBills: [],
  payments: [], accounts: [], settlements: [], contractTexts: [] as ContractText[], links: [] as TenancyLink[], templates: {} as Record<string, Clause[]>,
  online: true, userId: 'owner', myName: 'Maria Santos', loading: false, error: null, busy: false,
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
  state.renters = [person('r1', 'Ana Cruz'), person('r2', 'Ben Reyes'), person('r3', 'Carlo Lim'), person('r4', 'Dina Sy'),
    person('r5', 'Eli Go'), person('r6', 'Fe Ong'), person('r7', 'Gus Past')];
  state.tenancies = [stay('t1', 'u1', 'r1'), stay('t2', 'u2', 'r2'), stay('t3', 'u3', 'r3'), stay('t4', 'u4', 'r4'),
    stay('t5', 'u5', 'r5'), stay('t6', 'u6', 'r6', { contractNotNeeded: true }), stay('t7', 'u7', 'r7', { moveOut: '2026-09-01' })];
  // Ana: none · Ben: draft · Carlo: sent · Dina: signed · Eli: done · Fe: not needed · Gus: moved out with none.
  state.contractTexts = [text('t2', 'draft'), text('t3', 'sent'), text('t4', 'signed'), text('t5', 'countersigned')];
  state.links = [];
  state.templates = { p: DEFAULT_CLAUSES };
  state.run.mockResolvedValue(undefined);
});

const page = (tab?: string) => {
  render(<MemoryRouter><RentalsPage /></MemoryRouter>);
  if (tab) fireEvent.click(screen.getByRole('button', { name: tab }));
};
const todo = () => within(screen.getByRole('region', { name: 'To do for October' }));
const before = (a: HTMLElement, b: HTMLElement) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

describe('Contract to-dos on Home', () => {
  it('come first, one per active tenant by stage, in plain words', () => {
    page();
    const titles = todo().getAllByRole('listitem').map((li) => li.textContent ?? '');
    expect(titles.slice(0, 4)).toEqual([
      expect.stringContaining('Create contract for Ana Cruz'), expect.stringContaining('Send contract to Ben Reyes'),
      expect.stringContaining('Waiting for Carlo Lim to sign'), expect.stringContaining('Countersign contract for Dina Sy')]);
    // Other to-dos follow (the free bed of moved-out Gus).
    expect(titles.length).toBeGreaterThan(4);
    for (const name of ['Eli Go', 'Fe Ong', 'Gus Past']) expect(todo().queryByText(new RegExp(name))).toBeNull();
  });

  it('open the tenant sheet at the Contract section, shown first', async () => {
    page();
    fireEvent.click(todo().getByRole('button', { name: 'Create contract for Ana Cruz' }));
    const contract = screen.getByRole('region', { name: 'Contract' });
    await waitFor(() => expect(contract).toHaveFocus());
    expect(before(contract, screen.getByRole('region', { name: 'Rent' }))).toBe(true);
    expect(within(contract).getByText('Next step: the written contract.')).toBeInTheDocument();
    expect(within(contract).getByRole('button', { name: 'Create contract' })).toBeInTheDocument();
  });

  it('offer Not needed only before the contract is sent', async () => {
    page();
    expect(todo().getAllByRole('button', { name: /^Contract not needed for/ }).map((b) => b.getAttribute('aria-label')))
      .toEqual(['Contract not needed for Ana Cruz', 'Contract not needed for Ben Reyes']);
    fireEvent.click(todo().getByRole('button', { name: 'Contract not needed for Ana Cruz' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'setContractNotNeeded', tenancyId: 't1', value: true }));
  });

  it('are hidden from viewers', () => {
    state.properties = [{ ...property, role: 'viewer' }];
    page();
    expect(screen.queryByText(/Create contract for|Not needed/)).toBeNull();
  });
});

describe('Contract section on the tenant sheet', () => {
  const openSheet = (name: string) => { page('Tenants'); fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${name}`) })); };

  it('explains the next step for each open stage', () => {
    openSheet('Carlo Lim');
    expect(within(screen.getByRole('region', { name: 'Contract' })).getByText('Next step: the tenant signs through their link.')).toBeInTheDocument();
  });

  it('returns to its usual place once done', () => {
    openSheet('Eli Go');
    const contract = screen.getByRole('region', { name: 'Contract' });
    expect(before(screen.getByRole('region', { name: 'Rent' }), contract)).toBe(true);
    expect(within(contract).queryByText(/Next step/)).toBeNull();
  });

  it('says not needed with Undo for managers, and stays in its usual place', async () => {
    openSheet('Fe Ong');
    const contract = screen.getByRole('region', { name: 'Contract' });
    expect(before(screen.getByRole('region', { name: 'Rent' }), contract)).toBe(true);
    expect(within(contract).getByText('Contract not needed')).toBeInTheDocument();
    expect(within(contract).queryByRole('button', { name: 'Create contract' })).toBeNull();
    fireEvent.click(within(contract).getByRole('button', { name: 'Undo' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'setContractNotNeeded', tenancyId: 't6', value: false }));
  });

  it('lets a manager dismiss it from the sheet too', async () => {
    openSheet('Ana Cruz');
    fireEvent.click(within(screen.getByRole('region', { name: 'Contract' })).getByRole('button', { name: 'Not needed' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'setContractNotNeeded', tenancyId: 't1', value: true }));
  });

  it('is read-only for viewers', () => {
    state.properties = [{ ...property, role: 'viewer' }];
    openSheet('Fe Ong');
    const contract = within(screen.getByRole('region', { name: 'Contract' }));
    expect(contract.getByText('Contract not needed')).toBeInTheDocument();
    expect(contract.queryByRole('button', { name: 'Undo' })).toBeNull();
    screen.getByRole('dialog').querySelectorAll('button').forEach((b) => expect(b).not.toHaveTextContent('Not needed'));
  });
});

describe('Contract badges', () => {
  const badges = { 'Ana Cruz': 'No contract', 'Ben Reyes': 'Contract not sent', 'Carlo Lim': 'Waiting to sign', 'Dina Sy': 'Needs your signature' };
  const quiet = ['Eli Go', 'Fe Ong'];
  const ALL = /No contract|Contract not sent|Waiting to sign|Needs your signature/;

  it('show on the Tenants list, for viewers too', () => {
    state.properties = [{ ...property, role: 'viewer' }];
    page('Tenants');
    for (const [name, badge] of Object.entries(badges)) expect(screen.getByRole('button', { name: new RegExp(`^${name}`) })).toHaveTextContent(badge);
    for (const name of quiet) expect(screen.getByRole('button', { name: new RegExp(`^${name}`) })).not.toHaveTextContent(ALL);
  });

  it('show on the Rooms board', () => {
    page('Rooms');
    for (const [i, [, badge]] of Object.entries(badges).entries()) {
      expect(within(screen.getByRole('region', { name: `Room ${i + 1}` })).getByText(badge)).toBeInTheDocument();
    }
    for (const room of ['Room 5', 'Room 6']) expect(within(screen.getByRole('region', { name: room })).queryByText(ALL)).toBeNull();
  });
});

describe('After Add tenant', () => {
  const addElle = (sendLink: boolean) => {
    state.run.mockImplementation(async (a: { type: string }) => {
      if (a.type === 'createLink') return 'tok9';
      if (a.type !== 'addTenant') return undefined;
      // In place: the page holds these arrays until the next fetch.
      state.renters.push(person('r9', 'Elle Tan'));
      state.tenancies.push(stay('t9', 'u7', 'r9'));
      return { renterId: 'r9', tenancyId: 't9', warnings: [] };
    });
    page('Rooms');
    fireEvent.click(within(screen.getByRole('region', { name: 'Room 7' })).getByRole('button', { name: /Add tenant/ }));
    if (sendLink) fireEvent.click(screen.getByRole('checkbox', { name: /Send details link/ }));
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Elle Tan' } });
    if (!sendLink) fireEvent.change(screen.getByLabelText('Mobile number'), { target: { value: '0918' } });
    fireEvent.click(screen.getByRole('button', { name: 'Move in' }));
  };

  it('opens the new tenant’s sheet at the Contract section', async () => {
    addElle(false);
    const contract = await screen.findByRole('region', { name: 'Contract' });
    expect(screen.getByRole('heading', { name: 'Elle Tan' })).toBeInTheDocument();
    await waitFor(() => expect(contract).toHaveFocus());
    expect(within(contract).getByRole('button', { name: 'Create contract' })).toBeInTheDocument();
  });

  it('keeps the details-link dialog and says the contract is next', async () => {
    addElle(true);
    expect(await screen.findByText(/Create their contract next\./)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Contract' })).toBeNull();
  });
});

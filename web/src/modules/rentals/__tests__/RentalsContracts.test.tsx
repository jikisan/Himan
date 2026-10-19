import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DEFAULT_CLAUSES, contractStatusLabel, contractValues, linkMessage, renderClauses } from '@himan/shared/rentals';
import type { Clause, ContractText, RentalProperty, RentalTenancy, Renter, TenancyLink } from '@himan/shared/rentals';
import { RentalsPage } from '../presentation/pages/RentalsPage';

const PNG = 'data:image/png;base64,AAAA';
const pad = vi.hoisted(() => ({ fire: () => {} }));
vi.mock('signature_pad', () => ({
  default: class {
    addEventListener(_: string, fn: () => void) { pad.fire = fn; }
    toDataURL() { return 'data:image/png;base64,AAAA'; }
    clear() {} off() {} on() {} toData() { return []; } fromData() {}
  },
}));

const property: RentalProperty = {
  id: 'p', createdBy: 'owner', name: 'Bakilid House', address: '12 Bakilid Road, Mandaue City', ownerName: '', ownerAddress: '',
  lessorName: 'Maria Santos', lessorCivilStatus: 'married', lessorAddress: 'Cebu City', lessorCapacity: 'owner', signingCity: 'Mandaue City',
  invoicePrefix: 'INV', lateFeeCentavos: 0, rentDueDay: null, paymentsTrackedFrom: null, lessorSignature: PNG, archivedAt: null, createdAt: '', updatedAt: '',
  role: 'owner',
  units: [{ id: 'u2', propertyId: 'p', name: 'Room B', kind: 'room', capacity: 1, electricMode: 'none', electricAmountCentavos: 0, waterMode: 'none',
    waterAmountCentavos: 0, defaultRentCentavos: 0, extraPersonRentCentavos: 0 }],
};
const carlo: Renter = { id: 'r3', propertyId: 'p', fullName: 'Carlo Lim', phone: '0917', facebook: '', email: '', address: 'Lapu-Lapu City',
  emergencyName: '', emergencyPhone: '', occupants: 1, notes: '', files: [] };
const tenancy: RentalTenancy = { id: 't3', propertyId: 'p', unitId: 'u2', renterId: 'r3', moveIn: '2026-03-01', moveOut: null, charges: [],
  contracts: [{ id: 'c-t3', tenancyId: 't3', startDate: '2026-03-01', endDate: '2027-03-01', monthlyRentCentavos: 350000,
    dueDay: 30, advanceMonths: 1, depositCentavos: 350000, status: 'active' }] };
const body = (signingDate = '2026-10-10') =>
  renderClauses(DEFAULT_CLAUSES, contractValues({ property, renter: carlo, contract: tenancy.contracts[0], signingDate }));
// What a new contract stores: everything resolved except the tenant's name and address, filled in when they sign.
const stored = (signingDate = '2026-10-10') =>
  renderClauses(DEFAULT_CLAUSES, contractValues({ property, contract: tenancy.contracts[0], signingDate }), { keepLessee: true });
const text = (extra: Partial<ContractText> = {}): ContractText => ({ id: 'ct', propertyId: 'p', contractId: 'c-t3', body: body(),
  specialTerms: '', status: 'draft', signMode: null, contentHash: null, tenantName: null, tenantSignature: null, tenantSignedAt: null,
  lessorSignedAt: null, lessorSignature: null, notarizedScanPath: null, createdAt: '', updatedAt: '', ...extra });
const link = (extra: Partial<TenancyLink> = {}): TenancyLink => ({ tenancyId: 't3', propertyId: 'p', token: 'tok-old', kind: 'existing',
  status: 'open', submittedDetails: null, submittedAt: null, acceptedAt: null, revokedAt: null, createdAt: '', ...extra });

const state = vi.hoisted(() => ({
  properties: [] as RentalProperty[], renters: [] as Renter[], tenancies: [] as RentalTenancy[], bills: [], readings: [], utilityBills: [],
  payments: [], accounts: [], settlements: [], contractTexts: [] as ContractText[], links: [] as TenancyLink[], templates: {} as Record<string, Clause[]>,
  online: true, userId: 'owner', myName: 'Maria Santos', loading: false, error: null, busy: false,
  run: vi.fn(), refetch: vi.fn(), fileUrl: vi.fn(), listMembers: vi.fn(async () => []), listFriends: vi.fn(async () => []),
}));
vi.mock('../presentation/hooks/useRentals', () => ({ useRentals: () => state }));
const toasts = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn(), warning: vi.fn() }));
vi.mock('sonner', () => ({ toast: toasts }));
const pdfs = vi.hoisted(() => ({ downloadContractPdf: vi.fn() }));
vi.mock('../presentation/pdf/download', () => pdfs);

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ scale: vi.fn(), drawImage: vi.fn() } as never);
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-10T02:00:00Z'));
  state.properties = [property];
  state.renters = [carlo];
  state.tenancies = [tenancy];
  state.contractTexts = [];
  state.links = [];
  state.templates = { p: DEFAULT_CLAUSES };
  state.run.mockResolvedValue(undefined);
});

const openSheet = () => {
  render(<MemoryRouter><RentalsPage /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: 'Rooms' }));
  fireEvent.click(within(screen.getByRole('region', { name: 'Room B' })).getByRole('button', { name: /^Carlo Lim/ }));
  return within(screen.getByRole('region', { name: 'Contract' }));
};

describe('Contract on the tenant sheet', () => {
  it('creates a draft from the template with special terms and a live preview', async () => {
    const contract = openSheet();
    fireEvent.click(contract.getByRole('button', { name: 'Create contract' }));
    const preview = within(contract.getByRole('region', { name: 'Preview' }));
    expect(preview.getByText(/Carlo Lim, also of legal age/)).toBeInTheDocument();
    fireEvent.change(contract.getByLabelText('Special terms'), { target: { value: 'The storage room is not included.' } });
    expect(preview.getByText(/Special terms: The storage room is not included\./)).toBeInTheDocument();
    fireEvent.click(contract.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'createContractText', contractId: 'c-t3', propertyId: 'p',
      body: stored(), specialTerms: 'The storage room is not included.', signMode: 'esign' }));
    expect(stored().join('\n')).toContain('{{lessee_name}}, also of legal age, and residing at {{lessee_address}}');
  });

  it('uses the property’s own template', () => {
    state.templates = { p: [{ id: 'x', text: 'Only clause for {{lessee_name}}' }] };
    const contract = openSheet();
    fireEvent.click(contract.getByRole('button', { name: 'Create contract' }));
    expect(within(contract.getByRole('region', { name: 'Preview' })).getByText('1. Only clause for Carlo Lim')).toBeInTheDocument();
  });

  it('sends a draft, makes a link, and copies it for Messenger', async () => {
    // Sending needs the owner's sign-mode choice.
    state.contractTexts = [text({ signMode: 'esign' })];
    state.run.mockImplementation(async (a: { type: string }) => (a.type === 'createLink' ? 'tok123' : undefined));
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const contract = openSheet();
    expect(contract.getByText(contractStatusLabel('draft', null))).toBeInTheDocument();
    fireEvent.click(contract.getByRole('button', { name: 'Send to tenant' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'createLink', tenancyId: 't3', kind: 'existing' }));
    expect(state.run).toHaveBeenCalledWith({ type: 'sendContract', id: 'ct' });
    fireEvent.click(await contract.findByRole('button', { name: 'Copy link for Messenger' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(linkMessage(`${location.origin}/r/tok123`, 'Carlo Lim', 'existing')));
  });

  it('reuses the open link and allows edits while waiting for the tenant, with the sign mode read-only', async () => {
    state.contractTexts = [text({ status: 'sent', signMode: 'notarize' })];
    state.links = [link()];
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const contract = openSheet();
    expect(contract.getByText(contractStatusLabel('sent', null))).toBeInTheDocument();
    fireEvent.click(contract.getByRole('button', { name: 'Copy link for Messenger' }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(linkMessage(`${location.origin}/r/tok-old`, 'Carlo Lim', 'existing')));
    expect(state.run).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'createLink' }));
    fireEvent.click(contract.getByRole('button', { name: 'Edit' }));
    // Sent: the tenant may already be reading it, so how it's signed is fixed.
    expect(contract.queryByRole('radio')).toBeNull();
    expect(contract.getByText('Signing: Sign online, then notarize')).toBeInTheDocument();
    fireEvent.change(contract.getByLabelText('Special terms'), { target: { value: 'No pets.' } });
    fireEvent.click(contract.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'updateContractText', id: 'ct', changes: { body: stored(), specialTerms: 'No pets.' } }));
  });

  it('lets the sign mode change while the contract is a draft', async () => {
    state.contractTexts = [text({ signMode: 'esign' })];
    const contract = openSheet();
    fireEvent.click(contract.getByRole('button', { name: 'Edit' }));
    fireEvent.click(contract.getByRole('radio', { name: /then notarize/ }));
    fireEvent.click(contract.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'updateContractText', id: 'ct',
      changes: { body: stored(), specialTerms: '', signMode: 'notarize' } }));
  });

  it('chooses the sign mode on a new draft, online only by default', async () => {
    const contract = openSheet();
    fireEvent.click(contract.getByRole('button', { name: 'Create contract' }));
    expect(contract.getByRole('radio', { name: /Sign online only/ })).toBeChecked();
    fireEvent.click(contract.getByRole('radio', { name: /then notarize/ }));
    fireEvent.click(contract.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith(expect.objectContaining({ type: 'createContractText', signMode: 'notarize' })));
  });

  it('shows the sign mode in plain words and needs one before sending', () => {
    state.contractTexts = [text({ signMode: 'notarize' })];
    let contract = openSheet();
    expect(contract.getByText('Signing: Sign online, then notarize')).toBeInTheDocument();
    expect(contract.getByRole('button', { name: 'Send to tenant' })).toBeEnabled();
    cleanup();
    state.contractTexts = [text({ signMode: null })];
    contract = openSheet();
    expect(contract.getByRole('button', { name: 'Send to tenant' })).toBeDisabled();
    expect(contract.getByText(/Choose how the contract is signed/)).toBeInTheDocument();
  });

  it('countersigns in one tap with the saved signature, and offers no Edit once signed', async () => {
    state.contractTexts = [text({ status: 'signed', signMode: 'esign', tenantSignedAt: '2026-10-09T01:00:00Z', tenantSignature: PNG })];
    const contract = openSheet();
    expect(contract.getByText(contractStatusLabel('signed', 'esign'))).toBeInTheDocument();
    expect(contract.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(contract.queryByLabelText('Upload notarized copy')).not.toBeInTheDocument();
    fireEvent.click(contract.getByRole('button', { name: 'Countersign' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'countersign', id: 'ct' }));
  });

  it('has a manager who isn’t the owner draw their own signature', async () => {
    state.properties = [{ ...property, role: 'manager', lessorSignature: undefined }];
    state.contractTexts = [text({ status: 'signed', signMode: 'esign', tenantSignedAt: '2026-10-09T01:00:00Z' })];
    const contract = openSheet();
    fireEvent.click(contract.getByRole('button', { name: 'Countersign' }));
    expect(state.run).not.toHaveBeenCalled();
    expect(contract.getByText('Draw your signature to countersign.')).toBeInTheDocument();
    act(() => pad.fire());
    fireEvent.click(contract.getByRole('button', { name: 'Sign and countersign' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'countersign', id: 'ct', signature: PNG }));
  });

  it('makes a new link of the same kind when the old one was turned off', async () => {
    state.contractTexts = [text({ status: 'sent' })];
    state.links = [link({ kind: 'new', status: 'accepted', revokedAt: '2026-10-01T00:00:00Z' })];
    state.run.mockImplementation(async (a: { type: string }) => (a.type === 'createLink' ? 'tok123' : undefined));
    const writeText = vi.fn(async () => undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const contract = openSheet();
    fireEvent.click(contract.getByRole('button', { name: 'Copy link for Messenger' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'createLink', tenancyId: 't3', kind: 'new' }));
  });

  it('asks for a drawn signature first when none is saved', async () => {
    state.properties = [{ ...property, lessorSignature: null }];
    state.contractTexts = [text({ status: 'signed', signMode: 'esign', tenantSignedAt: '2026-10-09T01:00:00Z' })];
    const contract = openSheet();
    fireEvent.click(contract.getByRole('button', { name: 'Countersign' }));
    expect(state.run).not.toHaveBeenCalled();
    const sign = contract.getByRole('button', { name: 'Sign and countersign' });
    expect(sign).toBeDisabled();
    act(() => pad.fire());
    fireEvent.click(sign);
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'countersign', id: 'ct', signature: PNG }));
  });

  it('takes the notarized copy when the tenant chose to notarize', async () => {
    state.contractTexts = [text({ status: 'countersigned', signMode: 'notarize', tenantSignedAt: '2026-10-09T01:00:00Z',
      lessorSignedAt: '2026-10-09T02:00:00Z' })];
    const contract = openSheet();
    expect(contract.getByText(contractStatusLabel('countersigned', 'notarize'))).toBeInTheDocument();
    expect(contract.getByRole('button', { name: 'Download PDF' })).toBeInTheDocument();
    const file = new File(['%PDF'], 'notarized.pdf', { type: 'application/pdf' });
    fireEvent.change(contract.getByLabelText('Upload notarized copy'), { target: { files: [file] } });
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'setNotarizedScan', id: 'ct',
      file: expect.objectContaining({ name: 'notarized.pdf', mimeType: 'application/pdf' }) }));
  });

  it('shows the status only to a viewer', () => {
    state.properties = [{ ...property, role: 'viewer' }];
    state.contractTexts = [text({ status: 'signed', tenantSignedAt: '2026-10-09T01:00:00Z' })];
    const contract = openSheet();
    expect(contract.getByText(contractStatusLabel('signed', null))).toBeInTheDocument();
    expect(contract.queryByRole('button', { name: 'Countersign' })).not.toBeInTheDocument();
    state.contractTexts = [];
  });

  it('opens a draft as the paper contract and downloads it as an unsigned copy', async () => {
    state.contractTexts = [text({ specialTerms: 'No pets.' })];
    const contract = openSheet();
    fireEvent.click(contract.getByRole('button', { name: 'View contract' }));
    const dialog = within(await screen.findByRole('dialog'));
    const paper = within(dialog.getByRole('article', { name: 'Contract of Lease' }));
    expect(paper.getByText(/Special terms: No pets\./)).toBeInTheDocument();
    expect(paper.queryByRole('img')).toBeNull();
    fireEvent.click(dialog.getByRole('button', { name: 'Download PDF' }));
    await waitFor(() => expect(pdfs.downloadContractPdf).toHaveBeenCalledWith(expect.objectContaining({
      tenantName: 'Carlo Lim', tenantSignature: null, lessorAddress: 'Cebu City', lines: expect.arrayContaining([expect.stringMatching(/Special terms: No pets\./)]) })));
  });

  it('lets a viewer read the signed contract with both signatures', async () => {
    state.properties = [{ ...property, role: 'viewer' }];
    state.contractTexts = [text({ status: 'countersigned', signMode: 'esign', tenantName: 'Carlo Lim', tenantSignature: PNG,
      tenantSignedAt: '2026-10-09T01:00:00Z', lessorSignature: PNG, lessorSignedAt: '2026-10-09T02:00:00Z' })];
    const contract = openSheet();
    expect(contract.getAllByRole('button', { name: 'Download PDF' })).toHaveLength(1);
    fireEvent.click(contract.getByRole('button', { name: 'View contract' }));
    const dialog = within(await screen.findByRole('dialog'));
    expect(dialog.getByRole('img', { name: 'Lessee signature' })).toHaveAttribute('src', PNG);
    expect(dialog.getByRole('img', { name: 'Lessor signature' })).toHaveAttribute('src', PNG);
    expect(dialog.getByRole('button', { name: 'Download PDF' })).toBeInTheDocument();
  });

  it('lists a tenant who signed on Home', () => {
    state.contractTexts = [text({ status: 'signed', tenantSignedAt: '2026-10-09T01:00:00Z' })];
    render(<MemoryRouter><RentalsPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Countersign contract for Carlo Lim' }));
    expect(within(screen.getByRole('region', { name: 'Contract' })).getByRole('button', { name: 'Countersign' })).toBeInTheDocument();
  });
});

describe('Contract template and signature in Edit property', () => {
  const openEdit = () => {
    render(<MemoryRouter><RentalsPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    return within(screen.getByRole('region', { name: 'Contract template' }));
  };

  it('edits, adds, removes and reorders clauses, inserts fields, and saves', async () => {
    state.templates = { p: [{ id: 'a', text: 'First' }, { id: 'b', text: 'Second' }] };
    const editor = openEdit();
    expect(editor.getByText('2 clauses')).toBeInTheDocument();
    fireEvent.change(editor.getByLabelText('Clause 1'), { target: { value: 'First, for ' } });
    fireEvent.change(editor.getByLabelText('Insert field into clause 1'), { target: { value: 'lessee_name' } });
    fireEvent.click(editor.getByRole('button', { name: 'Move clause 2 up' }));
    fireEvent.click(editor.getByRole('button', { name: 'Add clause' }));
    expect(editor.getByText('3 clauses')).toBeInTheDocument();
    fireEvent.change(editor.getByLabelText('Clause 3'), { target: { value: 'Third' } });
    fireEvent.click(editor.getByRole('button', { name: 'Remove clause 1' }));
    fireEvent.click(editor.getByRole('button', { name: 'Save template' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'saveTemplate', propertyId: 'p',
      clauses: [{ id: 'a', text: 'First, for {{lessee_name}}' }, expect.objectContaining({ text: 'Third' })] }));
  });

  it('asks before resetting to the default contract', async () => {
    state.templates = { p: [{ id: 'a', text: 'First' }] };
    const editor = openEdit();
    fireEvent.click(editor.getByRole('button', { name: 'Reset to default' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Reset' }));
    expect(editor.getByText(`${DEFAULT_CLAUSES.length} clauses`)).toBeInTheDocument();
    expect(state.run).not.toHaveBeenCalled();
  });

  it('hides the template and signature from managers', () => {
    state.properties = [{ ...property, role: 'manager' }];
    render(<MemoryRouter><RentalsPage /></MemoryRouter>);
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
  });

  it('draws and saves my signature, and asks before replacing a saved one', async () => {
    state.properties = [{ ...property, lessorSignature: null }];
    render(<MemoryRouter><RentalsPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const mine = within(screen.getByRole('region', { name: 'My signature' }));
    act(() => pad.fire());
    fireEvent.click(mine.getByRole('button', { name: 'Save signature' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'saveLessorSignature', propertyId: 'p', png: PNG }));
  });

  it('shows the saved signature with Replace behind a confirm', async () => {
    render(<MemoryRouter><RentalsPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const mine = within(screen.getByRole('region', { name: 'My signature' }));
    expect(mine.getByRole('img', { name: 'Your saved signature' })).toHaveAttribute('src', PNG);
    fireEvent.click(mine.getByRole('button', { name: 'Replace' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Replace signature' }));
    expect(mine.getByLabelText('Draw your signature')).toBeInTheDocument();
  });
});

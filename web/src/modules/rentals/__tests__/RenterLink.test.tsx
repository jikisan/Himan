import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { canonicalText, sha256Hex } from '@himan/shared/rentals';
import type { PublicLink } from '@himan/shared/rentals';
import { RenterLinkScreen } from '../presentation/renter/RenterLinkScreen';
import { contractLines } from '../presentation/utils/contract';

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
const repo = vi.hoisted(() => ({ getPublic: vi.fn(), uploadId: vi.fn(), submitDetails: vi.fn(), sign: vi.fn(), qrUrl: vi.fn((p: string) => `https://cdn/${p}`) }));
vi.mock('../infrastructure', () => ({
  LinkRepository: class { getPublic = repo.getPublic; uploadId = repo.uploadId; submitDetails = repo.submitDetails; sign = repo.sign; },
  PaymentAccountRepository: class { qrUrl = repo.qrUrl; },
}));
const pdfs = vi.hoisted(() => ({ downloadContractPdf: vi.fn(), downloadBillPdf: vi.fn(), downloadReceiptPdf: vi.fn() }));
vi.mock('../presentation/pdf/download', () => pdfs);
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const PNG = 'data:image/png;base64,AAAA';
const TOKEN = 'Zk3o9VQm2c1oZb8m3gq0bQ3n6zS6xKXr0a7b5pK1wQe';
const sent = { id: 'ct1', status: 'sent' as const, body: ['KNOW ALL MEN BY THESE PRESENTS:', '1. Rent is ₱5,000.'], specialTerms: 'No pets.',
  signMode: null, tenantSignedAt: null, lessorSigned: false, contentHash: null, tenantName: null, tenantSignature: null, signedInPerson: false };
const base = (extra: Partial<PublicLink> = {}): PublicLink => ({
  kind: 'existing', status: 'open', tenantName: 'Ben Cruz', roomName: 'Room A',
  property: { name: 'Bakilid House', address: 'Lot 1, Mandaue', lessorName: 'Maria Santos', lessorCapacity: 'owner', signingCity: 'Cebu City',
    invoicePrefix: 'BAK', ownerName: 'Maria Santos', ownerAddress: 'Banilad', lessorAddress: 'Talamban, Cebu City', lateFeeCentavos: 0 },
  contract: sent, bills: [], payments: [], accounts: [], lessee: { name: 'Ben Cruz', address: '' }, ...extra });

const fill = (label: string | RegExp, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const open = async (data: PublicLink | Error) => {
  if (data instanceof Error) repo.getPublic.mockRejectedValue(data); else repo.getPublic.mockResolvedValue(data);
  render(<RenterLinkScreen token={TOKEN} />);
  await waitFor(() => expect(screen.queryByRole('status', { name: 'Loading' })).toBeNull());
};
const pickId = (name = 'id.jpg', type = 'image/jpeg') =>
  fireEvent.change(screen.getByLabelText(/Valid ID/), { target: { files: [new File(['x'], name, { type })] } });
const fillDetails = () => {
  fill('Full name', 'Ben Cruz'); fill('Mobile number', '0917 111 2222'); fill('Home address', '5 Pajo, Lapu-Lapu City');
  fill('Emergency contact name', 'Rosa Cruz'); fill('Emergency contact number', '0918 333 4444');
};
const signNow = async (mode = /Sign online only/) => {
  fireEvent.click(screen.getByRole('radio', { name: mode }));
  fill('Type your full name', 'Ben Cruz');
  act(() => pad.instance!.fire());
  fireEvent.click(screen.getByRole('button', { name: 'Sign' }));
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-19T02:00:00Z'));
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage: vi.fn(), scale: vi.fn() } as never);
  repo.uploadId.mockResolvedValue(`${TOKEN}/0f8e0c8a-1111-2222-3333-444455556666.jpg`);
  repo.submitDetails.mockResolvedValue(undefined);
  repo.sign.mockResolvedValue(undefined);
});

describe('renter link page', () => {
  it('shows one friendly message for any link that does not work, without the token', async () => {
    await open(new Error('This link isn’t valid anymore'));
    expect(screen.getByText('This link isn’t valid anymore. Ask your landlord for a new one.')).toBeInTheDocument();
    expect(document.body.textContent).not.toContain(TOKEN);
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('keeps Submit off until the required details, an ID and the privacy box are there', async () => {
    await open(base({ kind: 'new', contract: null }));
    const submit = screen.getByRole('button', { name: 'Send my details' });
    expect(submit).toBeDisabled();
    fillDetails();
    expect(submit).toBeDisabled();
    pickId();
    await screen.findByText(/id\.jpg.*Uploaded/);
    expect(submit).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox', { name: /I agree that my landlord stores these details/ }));
    expect(submit).toBeEnabled();
    fill('Full name', ' ');
    expect(submit).toBeDisabled();
  });

  it('uploads each ID as chosen and shows a plain error when one fails', async () => {
    await open(base({ kind: 'new', contract: null }));
    repo.uploadId.mockRejectedValueOnce(new Error('Choose a PDF, JPEG, or PNG file'));
    pickId('id.gif', 'image/gif');
    expect(await screen.findByText(/Choose a PDF, JPEG, or PNG file/)).toBeInTheDocument();
    expect(repo.uploadId).toHaveBeenCalledWith(TOKEN, expect.objectContaining({ name: 'id.gif', mimeType: 'image/gif' }));
  });

  it('sends the details, thanks them, then locks the form and shows the sent contract', async () => {
    await open(base({ kind: 'new', contract: null }));
    fillDetails(); fill(/Email/, 'ben@example.com'); fill(/People living there/, '2');
    pickId(); await screen.findByText(/Uploaded/);
    fireEvent.click(screen.getByRole('checkbox', { name: /I agree/ }));
    repo.getPublic.mockResolvedValue(base({ kind: 'new', status: 'submitted' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send my details' }));
    expect(await screen.findByText('Thanks, your landlord will review your details.')).toBeInTheDocument();
    expect(repo.submitDetails).toHaveBeenCalledWith(TOKEN, { fullName: 'Ben Cruz', phone: '0917 111 2222', address: '5 Pajo, Lapu-Lapu City',
      emergencyName: 'Rosa Cruz', emergencyPhone: '0918 333 4444', facebook: '', email: 'ben@example.com', occupants: 2,
      idPaths: [`${TOKEN}/0f8e0c8a-1111-2222-3333-444455556666.jpg`] });
    expect(screen.queryByRole('button', { name: 'Send my details' })).toBeNull();
    expect(screen.queryByLabelText('Full name')).toBeNull();
    expect(await screen.findByRole('button', { name: 'Sign' })).toBeInTheDocument();
  });

  it('shows the database’s message when the details were already sent', async () => {
    await open(base({ kind: 'new', contract: null }));
    fillDetails(); pickId(); await screen.findByText(/Uploaded/);
    fireEvent.click(screen.getByRole('checkbox', { name: /I agree/ }));
    repo.submitDetails.mockRejectedValue(new Error('Your details were already sent'));
    fireEvent.click(screen.getByRole('button', { name: 'Send my details' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Your details were already sent');
  });

  it('does not let a new tenant sign before sending details', async () => {
    await open(base({ kind: 'new' }));
    expect(screen.queryByRole('button', { name: 'Sign' })).toBeNull();
    expect(screen.getByText(/Send your details first/)).toBeInTheDocument();
  });

  it('shows saved details as saved once accepted', async () => {
    await open(base({ kind: 'new', status: 'accepted', contract: null }));
    expect(screen.getByText(/Your landlord saved your details/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Full name')).toBeNull();
  });

  it('existing tenants get the contract only, with no form', async () => {
    await open(base());
    expect(screen.queryByLabelText('Mobile number')).toBeNull();
    expect(screen.getByText('Something wrong? Tell your landlord.')).toBeInTheDocument();
    expect(screen.getByText('2. Special terms: No pets.')).toBeInTheDocument();
  });

  it('shows the contract to sign as the paper copy, with blank signature lines', async () => {
    await open(base());
    const paper = within(screen.getByRole('article', { name: 'Contract of Lease' }));
    expect(paper.getByText('1. Rent is ₱5,000.')).toBeInTheDocument();
    expect(paper.getByText('2. Special terms: No pets.')).toBeInTheDocument();
    expect(paper.getByText('Talamban, Cebu City')).toBeInTheDocument();
    expect(paper.queryByRole('img')).toBeNull();
  });

  it('never shows a draft contract', async () => {
    await open(base({ contract: { ...sent, status: 'draft' } }));
    expect(screen.queryByText('1. Rent is ₱5,000.')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Sign' })).toBeNull();
    expect(screen.getByText(/hasn’t sent the contract yet/)).toBeInTheDocument();
  });

  it('signs with the hash of the text that was shown', async () => {
    await open(base());
    expect(screen.getByRole('button', { name: 'Sign' })).toBeDisabled();
    repo.getPublic.mockResolvedValue(base({ contract: { ...sent, status: 'signed', signMode: 'esign', tenantName: 'Ben Cruz',
      tenantSignature: PNG, tenantSignedAt: '2026-10-19T02:00:00Z' } }));
    await signNow();
    await waitFor(() => expect(repo.sign).toHaveBeenCalled());
    expect(repo.sign).toHaveBeenCalledWith(TOKEN, { name: 'Ben Cruz', signMode: 'esign', signature: PNG, userAgent: navigator.userAgent,
      contentHash: await sha256Hex(canonicalText(sent.body, sent.specialTerms)) });
    expect(await screen.findByText('Waiting for your landlord to countersign')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign' })).toBeNull();
  });

  it('fills the name and address the database will use into the contract, and signs that exact text', async () => {
    const body = ['{{lessee_name}}, of legal age, residing at {{lessee_address}},', '1. Rent is ₱5,000.'];
    await open(base({ contract: { ...sent, body }, lessee: { name: ' Ben Cruz ', address: 'Pajo, Lapu-Lapu City' } }));
    const paper = within(screen.getByRole('article', { name: 'Contract of Lease' }));
    expect(paper.getByText('Ben Cruz, of legal age, residing at Pajo, Lapu-Lapu City,')).toBeInTheDocument();
    await signNow();
    await waitFor(() => expect(repo.sign).toHaveBeenCalled());
    expect(repo.sign).toHaveBeenCalledWith(TOKEN, expect.objectContaining({
      contentHash: await sha256Hex(canonicalText(['Ben Cruz, of legal age, residing at Pajo, Lapu-Lapu City,', '1. Rent is ₱5,000.'], sent.specialTerms)) }));
  });

  it('reloads and asks to read again when the landlord changed the contract', async () => {
    await open(base());
    repo.sign.mockRejectedValue(new Error('The contract changed. Reload the page to read the latest version'));
    repo.getPublic.mockResolvedValue(base({ contract: { ...sent, body: ['KNOW ALL MEN BY THESE PRESENTS:', '1. Rent is ₱6,000.'] } }));
    await signNow();
    expect(await screen.findByText('Your landlord updated the contract. Please read it again.')).toBeInTheDocument();
    expect(screen.getByText('1. Rent is ₱6,000.')).toBeInTheDocument();
    expect(repo.getPublic).toHaveBeenCalledTimes(2);
  });

  it('shows the database’s message on a second signing', async () => {
    await open(base());
    repo.sign.mockRejectedValue(new Error('You already signed this contract'));
    await signNow();
    expect(await screen.findByRole('alert')).toHaveTextContent('You already signed this contract');
  });

  it('shows the signed contract and makes its PDF, with the notary page only for notarize', async () => {
    await open(base({ contract: { ...sent, status: 'countersigned', signMode: 'notarize', tenantName: 'Ben Cruz', tenantSignature: PNG,
      tenantSignedAt: '2026-10-19T02:00:00Z', lessorSigned: true, lessorSignature: PNG, lessorSignedAt: '2026-10-20T02:00:00Z',
      contentHash: 'a'.repeat(64) } }));
    expect(screen.getByText('Fully signed')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Your signature' })).toHaveAttribute('src', PNG);
    fireEvent.click(screen.getByRole('button', { name: /Download PDF/ }));
    await waitFor(() => expect(pdfs.downloadContractPdf).toHaveBeenCalledWith(expect.objectContaining({
      signMode: 'notarize', tenantName: 'Ben Cruz', tenantSignature: PNG, lessorSignature: PNG, lessorAddress: 'Talamban, Cebu City',
      lines: contractLines(sent.body, sent.specialTerms) })));
  });

  it('says the contract was signed in person when it was, on the page and in the PDF', async () => {
    await open(base({ contract: { ...sent, status: 'signed', signMode: 'esign', tenantName: 'Ben Cruz', tenantSignature: PNG,
      tenantSignedAt: '2026-10-19T02:00:00Z', contentHash: 'a'.repeat(64), signedInPerson: true } }));
    // The "You" card and the contract paper.
    expect(screen.getAllByText('Signed in person on Oct 19, 2026')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: /Download PDF/ }));
    await waitFor(() => expect(pdfs.downloadContractPdf).toHaveBeenCalledWith(expect.objectContaining({ signedInPerson: true })));
  });

  it('lists bills with their state, balance and credit, payments, and their PDFs', async () => {
    const rent = (n: number) => [{ kind: 'rent', label: 'Rent', amount: n }];
    await open(base({
      bills: [
        { id: 'b1', number: 'BAK-1', kind: 'move_in', period: '2026-08', issuedOn: '2026-08-01', dueOn: '2026-08-05', lines: rent(500000), paid: 500000, balance: 0 },
        { id: 'b2', number: 'BAK-2', kind: 'monthly', period: '2026-09', issuedOn: '2026-09-01', dueOn: '2026-09-30', lines: rent(500000), paid: 200000, balance: 300000 },
        { id: 'b3', number: 'BAK-3', kind: 'monthly', period: '2026-10', issuedOn: '2026-10-01', dueOn: '2026-10-30', lines: rent(500000), paid: 100000, balance: 400000 },
        { id: 'b4', number: 'BAK-4', kind: 'monthly', period: '2026-11', issuedOn: '2026-10-15', dueOn: '2026-11-30', lines: rent(500000), paid: 0, balance: 500000 },
      ] as PublicLink['bills'],
      payments: [
        { id: 'pay1', createdAt: '2026-08-02T00:00:00Z', paidOn: '2026-08-02', amount: 850000, method: 'gcash', reference: 'G1', billNumbers: ['BAK-1', 'BAK-2', 'BAK-3'],
          receipt: { applied: [{ billId: 'b1', number: 'BAK-1', amount: 500000 }], creditCentavos: 50000, balanceCentavos: 0 } },
      ],
    }));
    fireEvent.click(screen.getByRole('tab', { name: 'Bills' }));
    const bill = (n: string) => screen.getByRole('listitem', { name: new RegExp(n) });
    expect(within(bill('BAK-1')).getByText('Paid', { selector: 'span' })).toBeInTheDocument();
    expect(within(bill('BAK-2')).getByText('Overdue', { selector: 'span' })).toBeInTheDocument();
    expect(within(bill('BAK-3')).getByText('Partial', { selector: 'span' })).toBeInTheDocument();
    expect(within(bill('BAK-4')).getByText('Unpaid', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText('Total balance').nextSibling).toHaveTextContent('₱12,000');
    expect(screen.getByText('Credit').nextSibling).toHaveTextContent('₱500');
    fireEvent.click(within(bill('BAK-2')).getByRole('button', { name: /Download PDF/ }));
    await waitFor(() => expect(pdfs.downloadBillPdf).toHaveBeenCalledWith(expect.objectContaining({ id: 'b2', number: 'BAK-2' }),
      expect.objectContaining({ renterName: 'Ben Cruz', roomName: 'Room A', paidCentavos: 200000, previousBalanceCentavos: 0 }), expect.any(Function)));
    fireEvent.click(screen.getByRole('button', { name: /Receipt PDF/ }));
    await waitFor(() => expect(pdfs.downloadReceiptPdf).toHaveBeenCalledWith(expect.objectContaining({ id: 'pay1', amountCentavos: 850000 }),
      expect.objectContaining({ renterName: 'Ben Cruz' })));
    pdfs.downloadReceiptPdf.mockClear();
    fireEvent.click(screen.getByRole('button', { name: /^View receipt/ }));
    const dialog = within(await screen.findByRole('dialog'));
    expect(within(dialog.getByRole('article', { name: 'Acknowledgment Receipt' })).getByText('BAK-1 · Move-in SOA')).toBeInTheDocument();
    fireEvent.click(dialog.getByRole('button', { name: 'Download PDF' }));
    await waitFor(() => expect(pdfs.downloadReceiptPdf).toHaveBeenCalledWith(expect.objectContaining({ id: 'pay1' }), expect.objectContaining({ renterName: 'Ben Cruz' })));
  });

  it('shows payment accounts with their QR, falling back to text when the image fails', async () => {
    await open(base({ accounts: [{ id: 'a1', kind: 'gcash', label: '', accountName: 'Maria Santos', accountNumber: '0917 000 0000', qrPath: 'p/a1.png' }] }));
    fireEvent.click(screen.getByRole('tab', { name: 'Bills' }));
    const img = screen.getByRole('img', { name: /QR code/ });
    expect(img).toHaveAttribute('src', 'https://cdn/p/a1.png');
    fireEvent.error(img);
    expect(screen.queryByRole('img', { name: /QR code/ })).toBeNull();
    expect(screen.getByText(/0917 000 0000/)).toBeInTheDocument();
  });

  it('never mentions ID files or payment proofs outside the details form', async () => {
    await open(base({ kind: 'existing', status: 'open' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Bills' }));
    expect(document.body.textContent).not.toMatch(/proof|valid ID|idPaths/i);
  });

  it('shows the landlord’s chosen sign mode as plain text and signs with it', async () => {
    await open(base({ contract: { ...sent, signMode: 'notarize' } }));
    expect(screen.queryByRole('radio')).toBeNull();
    expect(screen.getByText('Your landlord asked you to sign online and then have it notarized.')).toBeInTheDocument();
    fill('Type your full name', 'Ben Cruz');
    act(() => pad.instance!.fire());
    fireEvent.click(screen.getByRole('button', { name: 'Sign' }));
    await waitFor(() => expect(repo.sign).toHaveBeenCalledWith(TOKEN, expect.objectContaining({ signMode: 'notarize' })));
  });

  it('says no notary is needed when the landlord chose online signing', async () => {
    await open(base({ contract: { ...sent, signMode: 'esign' } }));
    expect(screen.queryByRole('radio')).toBeNull();
    expect(screen.getByText('You can sign online. No notary needed.')).toBeInTheDocument();
  });
});

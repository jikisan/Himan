import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { RentalProperty } from '@himan/shared/rentals';
import { PropertyForm } from '../presentation/components/PropertyForm';
import { RenterForm } from '../presentation/components/RenterForm';
import { UnitForm } from '../presentation/components/UnitForm';
import { SetupWizard } from '../presentation/components/SetupWizard';
import { PaymentAccountsEditor } from '../presentation/components/PaymentAccountsEditor';
import { ContractTemplateEditor, LessorSignatureEditor } from '../presentation/components/ContractTemplateEditor';
import { expectBanner, expectFieldError, expectNoErrorAfter, expectRequired } from './formErrors';

const pad = vi.hoisted(() => ({ fire: () => {} }));
vi.mock('signature_pad', () => ({
  default: class {
    addEventListener(_: string, fn: () => void) { pad.fire = fn; }
    toDataURL() { return 'data:image/png;base64,AAAA'; }
    clear() {} off() {} on() {} toData() { return []; } fromData() {}
  },
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

const byId = (id: string) => document.getElementById(id)!;
const type = (id: string, value: string) => fireEvent.change(byId(id), { target: { value } });
const refuse = () => vi.fn(async () => { throw new Error('The database said no'); });
const noop = () => {};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ scale: vi.fn(), drawImage: vi.fn() } as never);
});

describe('Property form errors', () => {
  const open = (onSave = vi.fn(async () => {})) => {
    render(<MemoryRouter><PropertyForm myName="Maria Santos" busy={false} onSave={onSave} onCancel={noop} /></MemoryRouter>);
    return screen.getByRole('button', { name: 'Save property' });
  };

  it('marks the name required, and a bad submit takes you to it with the message under it', () => {
    const save = open();
    expectRequired('property-name');
    fireEvent.click(save);
    expectFieldError('property-name', 'Enter a property name');
    expectNoErrorAfter(save);
    type('property-name', 'Bakilid House');
    expect(byId('property-name')).not.toHaveAttribute('aria-invalid');
    expect(document.getElementById('property-name-error')).toBeNull();
  });

  it('puts the late fee and due day messages under their own fields', () => {
    const save = open();
    type('property-name', 'Bakilid House');
    type('property-late-fee', 'abc');
    fireEvent.click(save);
    expectFieldError('property-late-fee', 'Late fee: Enter an amount like 10,000 or 1,500.50');
    type('property-late-fee', '');
    type('property-due', '32');
    fireEvent.click(save);
    expectFieldError('property-due', 'Due day is 1–31');
  });

  it('shows a refusal in one banner at the top', async () => {
    open(refuse());
    type('property-name', 'Bakilid House');
    fireEvent.click(screen.getByRole('button', { name: 'Save property' }));
    await waitFor(() => expectBanner('The database said no', byId('property-name')));
  });
});

describe('Tenant form errors', () => {
  const open = (onSave = vi.fn(async () => {})) => {
    render(<RenterForm readOnly={false} busy={false} onSave={onSave} onCancel={noop} />);
    return screen.getByRole('button', { name: 'Save tenant' });
  };

  it('takes you to the missing name, then to a bad email', () => {
    const save = open();
    expectRequired('renter-fullName');
    fireEvent.click(save);
    expectFieldError('renter-fullName', 'Enter the tenant’s name');
    expectNoErrorAfter(save);
    type('renter-fullName', 'Juan Dela Cruz');
    type('renter-email', 'juan@');
    fireEvent.click(save);
    expectFieldError('renter-email', 'Enter a valid email');
  });

  it('shows a refusal in one banner at the top', async () => {
    open(refuse());
    type('renter-fullName', 'Juan Dela Cruz');
    fireEvent.click(screen.getByRole('button', { name: 'Save tenant' }));
    await waitFor(() => expectBanner('The database said no', byId('renter-fullName')));
  });
});

describe('Room form errors', () => {
  const open = (onSave = vi.fn(async () => {})) => {
    render(<UnitForm busy={false} onSave={onSave} onCancel={noop} />);
    return screen.getByRole('button', { name: 'Save room' });
  };

  it('takes you to the missing room name', () => {
    const save = open();
    expectRequired('unit-name');
    fireEvent.click(save);
    expectFieldError('unit-name', 'Enter a room name');
    expectNoErrorAfter(save);
  });

  it('puts a bad price under the price, and a bad rent under the rent', () => {
    const save = open();
    type('unit-name', 'Room C');
    type('unit-electric', 'submeter');
    expectRequired('unit-electric-amount');
    type('unit-electric-amount', 'twelve');
    fireEvent.click(save);
    expectFieldError('unit-electric-amount', 'Enter an amount like 10,000 or 1,500.50');
    expectNoErrorAfter(save);
    type('unit-electric-amount', '12');
    type('unit-rent', 'lots');
    fireEvent.click(save);
    expectFieldError('unit-rent', 'Enter an amount like 10,000 or 1,500.50');
  });

  it('shows a refusal in one banner at the top', async () => {
    open(refuse());
    type('unit-name', 'Room C');
    fireEvent.click(screen.getByRole('button', { name: 'Save room' }));
    await waitFor(() => expectBanner('The database said no', byId('unit-name')));
  });
});

describe('Setup wizard errors', () => {
  const open = (onFinish = vi.fn(async () => {})) => {
    render(<SetupWizard myName="Maria Santos" busy={false} onFinish={onFinish} onCancel={noop} />);
  };
  const next = () => fireEvent.click(screen.getByRole('button', { name: 'Next' }));

  it('takes you to the property name, then the due day', () => {
    open();
    expectRequired('setup-name');
    next();
    expectFieldError('setup-name', 'Enter a property name');
    expectNoErrorAfter(screen.getByRole('button', { name: 'Next' }));
    type('setup-name', 'Lahug House');
    type('setup-due', '32');
    next();
    expectFieldError('setup-due', 'Due day is 1–31');
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
  });

  it('points at the room with the same name and at a bad rent', () => {
    open();
    type('setup-name', 'Lahug House');
    next();
    expectRequired('setup-room-0');
    fireEvent.click(screen.getByRole('button', { name: 'Add another room' }));
    type('setup-room-1', 'Room A');
    next();
    expectFieldError('setup-room-1', 'Give each room a different name');
    type('setup-room-1', 'Room B');
    type('setup-rent-0', 'lots');
    next();
    expectFieldError('setup-rent-0', 'Enter an amount like 10,000 or 1,500.50');
    expectNoErrorAfter(screen.getByRole('button', { name: 'Next' }));
  });

  it('puts a missing price under it, and a refusal in a banner', async () => {
    const finish = refuse();
    open(finish);
    type('setup-name', 'Lahug House');
    next();
    next();
    type('setup-water', 'fixed');
    fireEvent.click(screen.getByRole('button', { name: 'Finish setup' }));
    expectFieldError('setup-water-amount', 'Enter an amount like 10,000 or 1,500.50');
    type('setup-water', 'none');
    fireEvent.click(screen.getByRole('button', { name: 'Finish setup' }));
    await waitFor(() => expectBanner('The database said no', byId('setup-electric')));
  });
});

describe('Payment account errors', () => {
  it('takes you to the empty label, and shows a refusal above the fields', async () => {
    const run = vi.fn(async () => { throw new Error('The database said no'); });
    render(<PaymentAccountsEditor propertyId="p" accounts={[]} busy={false} run={run as never} qrUrl={(p) => p} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add payment account' }));
    expectRequired('account-new-label');
    type('account-new-label', '');
    const save = screen.getByRole('button', { name: 'Save account' });
    fireEvent.click(save);
    expectFieldError('account-new-label', 'Enter a label');
    expectNoErrorAfter(save);
    expect(run).not.toHaveBeenCalled();
    type('account-new-label', 'GCash');
    fireEvent.click(save);
    await waitFor(() => expectBanner('The database said no', byId('account-new-kind')));
    expectNoErrorAfter(save);
  });
});

describe('Contract template errors', () => {
  it('takes you to an empty clause, and shows the clause count rule and refusals in a banner', async () => {
    const run = vi.fn(async () => { throw new Error('The database said no'); });
    render(<ContractTemplateEditor propertyId="p" template={[{ id: 'a', text: 'First' }, { id: 'b', text: '' }]} busy={false} run={run as never} />);
    const save = screen.getByRole('button', { name: 'Save template' });
    const second = screen.getByLabelText('Clause 2');
    expect(second).toBeRequired();
    fireEvent.click(save);
    expectFieldError(second, 'A clause can’t be empty');
    expectNoErrorAfter(save);
    fireEvent.change(second, { target: { value: 'Second' } });
    expect(second).not.toHaveAttribute('aria-invalid');
    fireEvent.click(save);
    await waitFor(() => expectBanner('The database said no', screen.getByLabelText('Clause 1')));
    expectNoErrorAfter(save);
  });

  it('shows a failed signature save above the pad', async () => {
    const run = vi.fn(async () => { throw new Error('The database said no'); });
    const property = { id: 'p', lessorSignature: null } as unknown as RentalProperty;
    render(<LessorSignatureEditor property={property} busy={false} run={run as never} />);
    act(() => pad.fire());
    const save = screen.getByRole('button', { name: 'Save signature' });
    fireEvent.click(save);
    await waitFor(() => expectBanner('The database said no', screen.getByLabelText('Draw your signature')));
    expectNoErrorAfter(within(screen.getByRole('region', { name: 'My signature' })).getByRole('button', { name: 'Save signature' }));
  });
});

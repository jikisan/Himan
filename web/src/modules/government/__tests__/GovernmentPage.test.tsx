import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GovernmentPage } from '../presentation/pages/GovernmentPage';
import type { GovernmentGroup, GovernmentRecord } from '@himan/shared/government';

const personal: GovernmentGroup = { id: 'gp', userId: 'owner', name: 'Personal', kind: 'personal', createdAt: '1' };
const business: GovernmentGroup = { id: 'gb', userId: 'owner', name: 'Business', kind: 'business', createdAt: '1' };
const family: GovernmentGroup = { id: 'gf', userId: 'owner', name: 'Family', kind: 'custom', createdAt: '2' };
const record: GovernmentRecord = {
  id: 'record', userId: 'owner', groupId: 'gp', agency: 'SSS', label: 'My membership', registeredName: 'Test Person',
  number: '001-234-56789', issueDate: null, expiryDate: null, notes: '', deleting: false,
  createdAt: '', updatedAt: '', documents: [],
};
const state = vi.hoisted(() => ({ records: [] as GovernmentRecord[], groups: [] as GovernmentGroup[], online: true, userId: 'owner',
  loading: false, error: null, busy: false, run: vi.fn(), refetch: vi.fn(), documentUrl: vi.fn() }));
vi.mock('../presentation/hooks/useGovernment', () => ({ useGovernment: () => state }));

beforeEach(() => {
  vi.clearAllMocks(); state.records = [record]; state.groups = [personal, business]; state.online = true; state.userId = 'owner';
});
const page = () => <MemoryRouter><GovernmentPage /></MemoryRouter>;

describe('Government privacy and editing', () => {
  it('reveals and hides a preview number without opening a dialog and resets after account changes', () => {
    const view = render(page());
    expect(screen.queryByText(record.number)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reveal SSS number' }));
    expect(screen.getByText(record.number)).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Hide SSS number' }));
    expect(screen.queryByText(record.number)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reveal SSS number' }));
    state.userId = 'other'; state.records = [];
    view.rerender(page());
    state.userId = 'owner'; state.records = [record];
    view.rerender(page());
    expect(screen.queryByText(record.number)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reveal SSS number' })).toHaveAttribute('aria-pressed', 'false');
  });
  it('keeps numbers masked until explicitly revealed, then masks them again when reopened', async () => {
    render(page());
    expect(screen.queryByText(record.number)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'View My membership details' }));
    expect(screen.queryByText(record.number)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reveal number' }));
    expect(screen.getByText(record.number)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: 'View My membership details' }));
    expect(screen.queryByText(record.number)).not.toBeInTheDocument();
  });
  it('hides already-loaded records and dialogs when offline', async () => {
    const view = render(page());
    fireEvent.click(screen.getByRole('button', { name: 'View My membership details' }));
    state.online = false;
    view.rerender(page());
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByText(record.registeredName)).not.toBeInTheDocument();
    expect(screen.getByText('Connect to the internet to access your government records.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add record' })).toBeDisabled();
  });
  it('discards the visible edit form when the active account changes', async () => {
    const view = render(page());
    fireEvent.click(screen.getByRole('button', { name: 'View My membership details' }));
    fireEvent.click(screen.getByRole('button', { name: 'Edit details' }));
    expect(screen.getByDisplayValue(record.registeredName)).toBeInTheDocument();
    state.userId = 'other'; state.records = [];
    view.rerender(page());
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByDisplayValue(record.registeredName)).not.toBeInTheDocument();
  });
  it('discards deletion confirmations when the active account changes', async () => {
    const view = render(page());
    fireEvent.click(screen.getByRole('button', { name: 'View My membership details' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete record' }));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    state.userId = 'other'; state.records = [];
    view.rerender(page());
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(state.run).not.toHaveBeenCalled();
  });
  it('does not reopen an old revealed record after signing back into the original account', async () => {
    const view = render(page());
    fireEvent.click(screen.getByRole('button', { name: 'View My membership details' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reveal number' }));
    state.userId = 'other'; state.records = [];
    view.rerender(page());
    state.userId = 'owner'; state.records = [record];
    view.rerender(page());
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByText(record.number)).not.toBeInTheDocument();
  });
  it('saves a custom document-only record without requiring dates or a number', async () => {
    state.run.mockResolvedValue(undefined);
    render(page());
    fireEvent.click(screen.getByRole('button', { name: 'Add record' }));
    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'custom' } });
    fireEvent.change(screen.getByLabelText(/Custom type name/), { target: { value: 'PRC license' } });
    fireEvent.change(screen.getByLabelText(/Registered name/), { target: { value: 'Test Person' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save record' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'save', id: null,
      input: { agency: 'PRC license', label: 'PRC license', registeredName: 'Test Person', number: '',
        issueDate: null, expiryDate: null, notes: '', groupId: 'gp' } }));
  });
});

describe('Government record form errors', () => {
  it('marks required fields with an asterisk and the required attribute', () => {
    render(page());
    fireEvent.click(screen.getByRole('button', { name: 'Add record' }));
    const name = screen.getByLabelText(/Registered name/);
    expect(name).toBeRequired();
    expect(name.closest('div')?.querySelector('label')?.textContent).toContain('*');
  });
  it('focuses the empty custom type, outlines it and shows the message under it', async () => {
    render(page());
    fireEvent.click(screen.getByRole('button', { name: 'Add record' }));
    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'custom' } });
    fireEvent.change(screen.getByLabelText(/Registered name/), { target: { value: 'Test Person' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save record' }));
    const custom = screen.getByLabelText(/Custom type name/);
    await waitFor(() => expect(document.activeElement).toBe(custom));
    expect(custom).toHaveAttribute('aria-invalid', 'true');
    expect(document.getElementById('gov-custom-error')).toHaveTextContent('Choose a type');
    fireEvent.change(custom, { target: { value: 'PRC' } });
    expect(custom).not.toHaveAttribute('aria-invalid');
    expect(state.run).not.toHaveBeenCalled();
  });
  it('focuses the empty registered name', async () => {
    render(page());
    fireEvent.click(screen.getByRole('button', { name: 'Add record' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save record' }));
    const name = screen.getByLabelText(/Registered name/);
    await waitFor(() => expect(document.activeElement).toBe(name));
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(document.getElementById('gov-name-error')).toHaveTextContent('Enter the registered name');
  });
  it('shows a save failure in the banner at the top of the form', async () => {
    state.run.mockRejectedValue(new Error('offline'));
    render(page());
    fireEvent.click(screen.getByRole('button', { name: 'Add record' }));
    fireEvent.change(screen.getByLabelText(/Registered name/), { target: { value: 'Test Person' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save record' }));
    const banner = await screen.findByText('Could not save this record. Your changes are still here; retry when connected.');
    expect(banner).toHaveAttribute('data-form-error');
    const form = banner.closest('form')!;
    expect(form.firstElementChild).toBe(banner);
  });
  it('shows a rejected attachment under the file input', async () => {
    render(page());
    fireEvent.click(screen.getByRole('button', { name: 'View My membership details' }));
    const input = screen.getByLabelText('Attach existing files');
    fireEvent.change(input, { target: { files: [new File(['x'], 'notes.txt', { type: 'text/plain' })] } });
    await waitFor(() => expect(input).toHaveAttribute('aria-invalid', 'true'));
    expect(document.activeElement).toBe(input);
    expect(document.getElementById('gov-upload-error')).not.toBeEmptyDOMElement();
    expect(state.run).not.toHaveBeenCalled();
  });
});

describe('Government groups', () => {
  const taxRecord: GovernmentRecord = { ...record, id: 'tax', groupId: 'gb', agency: 'TIN', label: 'TIN', number: '999' };
  it('shows Personal and Business with counts and filters the list by group', () => {
    state.records = [record, taxRecord];
    render(page());
    const bar = screen.getByRole('group', { name: 'Filter by group' });
    expect(bar).toHaveTextContent('All (2)');
    expect(bar).toHaveTextContent('Personal (1)');
    expect(bar).toHaveTextContent('Business (1)');
    fireEvent.click(screen.getByRole('button', { name: /^Business/ }));
    expect(screen.getByRole('button', { name: 'Reveal TIN number' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reveal SSS number' })).not.toBeInTheDocument();
  });
  it('lets the user pick a group when adding a record', async () => {
    state.run.mockResolvedValue(undefined);
    render(page());
    fireEvent.click(screen.getByRole('button', { name: 'Business (0)' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add record' }));
    expect(screen.getByLabelText('Group')).toHaveValue('gb');
    fireEvent.change(screen.getByLabelText(/Registered name/), { target: { value: 'Test Person' } });
    fireEvent.change(screen.getByLabelText('Group'), { target: { value: 'gp' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save record' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith(expect.objectContaining({ type: 'save', input: expect.objectContaining({ groupId: 'gp' }) })));
  });
  it('adds a group, rejects duplicate names, and only offers rename and delete for custom groups', async () => {
    state.run.mockResolvedValue(undefined); state.groups = [personal, business, family];
    render(page());
    fireEvent.click(screen.getByRole('button', { name: 'Manage groups' }));
    expect(screen.getAllByRole('button', { name: /^Rename/ })).toHaveLength(1);
    expect(screen.getAllByRole('button', { name: /^Delete/ })).toHaveLength(1);
    fireEvent.change(screen.getByLabelText('New group name'), { target: { value: ' business ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add group' }));
    expect(await screen.findByText('You already have a group with that name')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('New group name'), { target: { value: 'Pension' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add group' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'addGroup', name: 'Pension' }));
  });
  it('renames a custom group', async () => {
    state.run.mockResolvedValue(undefined); state.groups = [personal, business, family];
    render(page());
    fireEvent.click(screen.getByRole('button', { name: 'Manage groups' }));
    fireEvent.click(screen.getByRole('button', { name: /^Rename/ }));
    fireEvent.change(screen.getByLabelText(/New name for Family/), { target: { value: 'Relatives' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save name' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'renameGroup', id: 'gf', name: 'Relatives' }));
  });
  it('confirms before deleting a group and says its records move to Personal', async () => {
    state.run.mockResolvedValue(undefined); state.groups = [personal, business, family];
    state.records = [{ ...record, groupId: 'gf' }];
    render(page());
    fireEvent.click(screen.getByRole('button', { name: 'Manage groups' }));
    fireEvent.click(screen.getByRole('button', { name: /^Delete/ }));
    const confirm = screen.getByRole('alertdialog');
    expect(confirm).toHaveTextContent('1 record will move to Personal');
    expect(state.run).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Delete group' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'removeGroup', id: 'gf' }));
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { GovernmentPage } from '../presentation/pages/GovernmentPage';
import type { GovernmentRecord } from '@himan/shared/government';

const record: GovernmentRecord = {
  id: 'record', userId: 'owner', agency: 'SSS', label: 'My membership', registeredName: 'Test Person',
  number: '001-234-56789', issueDate: null, expiryDate: null, notes: '', deleting: false,
  createdAt: '', updatedAt: '', documents: [],
};
const state = vi.hoisted(() => ({ records: [] as GovernmentRecord[], online: true, userId: 'owner',
  loading: false, error: null, busy: false, run: vi.fn(), refetch: vi.fn(), documentUrl: vi.fn() }));
vi.mock('../presentation/hooks/useGovernment', () => ({ useGovernment: () => state }));

beforeEach(() => {
  vi.clearAllMocks(); state.records = [record]; state.online = true; state.userId = 'owner';
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
    fireEvent.change(screen.getByLabelText('Custom type name'), { target: { value: 'PRC license' } });
    fireEvent.change(screen.getByLabelText('Registered name'), { target: { value: 'Test Person' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save record' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'save', id: null,
      input: { agency: 'PRC license', label: 'PRC license', registeredName: 'Test Person', number: '',
        issueDate: null, expiryDate: null, notes: '' } }));
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { addDays, format } from 'date-fns';
import { ReceiptsPage } from '../presentation/pages/ReceiptsPage';
import type { Receipt } from '@himan/shared/receipts';

const day = (offset: number) => format(addDays(new Date(), offset), 'yyyy-MM-dd');
const make = (id: string, patch: Partial<Receipt>): Receipt => ({
  id, userId: 'owner', merchant: id, amount: 100, purchasedOn: day(-100), note: '', tags: [], warrantyEndsOn: null, expiresOn: null,
  photoPath: `owner/${id}.jpg`, createdAt: '', updatedAt: '', ...patch,
});
const state = vi.hoisted(() => ({ receipts: [] as Receipt[], online: true, userId: 'owner', loading: false, error: null,
  busy: false, run: vi.fn(), refetch: vi.fn(), photoUrls: {} as Record<string, string> }));
vi.mock('../presentation/hooks/useReceipts', () => ({ useReceipts: () => state }));
// Exit animations never finish in happy-dom, which would leave removed cards in the tree.
vi.mock('motion/react', async () => {
  const React = await import('react');
  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    MotionConfig: ({ children }: { children: React.ReactNode }) => children,
    motion: { li: ({ children, className }: { children: React.ReactNode; className?: string }) => React.createElement('li', { className }, children) },
  };
});
vi.mock('../presentation/utils/compressImage', () => ({ compressImage: async () => new Blob(['x'], { type: 'image/jpeg' }) }));

beforeEach(() => {
  vi.clearAllMocks();
  state.online = true; state.busy = false;
  state.receipts = [
    make('Hardware Hub', { tags: ['tools'], warrantyEndsOn: day(10) }),
    make('Corner Market', { tags: ['food'] }),
    make('Old Fridge Shop', { tags: ['appliance'], warrantyEndsOn: day(-3) }),
  ];
});
const page = () => render(<MemoryRouter><ReceiptsPage /></MemoryRouter>);
const names = () => screen.getAllByRole('button', { name: /^Open / }).map((b) => b.getAttribute('aria-label'));

describe('Receipts page', () => {
  it('shows a labelled warranty chip with words, not colour alone', () => {
    page();
    expect(screen.getByText('Warranty ends in 10 days')).toBeInTheDocument();
    expect(screen.getByText('Warranty ended 3 days ago')).toBeInTheDocument();
  });
  it('filters by search and by tag', () => {
    page();
    fireEvent.change(screen.getByLabelText('Search receipts'), { target: { value: 'market' } });
    expect(names()).toEqual(['Open Corner Market receipt']);
    fireEvent.change(screen.getByLabelText('Search receipts'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'tools (1)' }));
    expect(names()).toEqual(['Open Hardware Hub receipt']);
    fireEvent.click(screen.getByRole('button', { name: 'Clear tag filter' }));
    expect(names()).toHaveLength(3);
  });
  it('lists only receipts ending within 30 days in the expiring soon view', () => {
    page();
    fireEvent.click(screen.getByRole('button', { name: 'Expiring soon (1)' }));
    expect(names()).toEqual(['Open Hardware Hub receipt']);
  });
  it('asks before deleting and only deletes after confirming', async () => {
    state.run.mockResolvedValue(undefined);
    page();
    fireEvent.click(screen.getByRole('button', { name: 'Open Corner Market receipt' }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete receipt' }));
    expect(state.run).not.toHaveBeenCalled();
    const confirm = await screen.findByRole('alertdialog');
    fireEvent.click(within(confirm).getByRole('button', { name: 'Permanently delete' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'remove', receipt: expect.objectContaining({ id: 'Corner Market' }) }));
  });
  it('requires a photo, then saves with the compressed photo and normalized tags', async () => {
    state.run.mockResolvedValue(make('new', {}));
    page();
    fireEvent.click(screen.getByRole('button', { name: 'Add receipt' }));
    fireEvent.change(await screen.findByLabelText(/^Store/), { target: { value: 'Shoe Shop' } });
    fireEvent.change(screen.getByLabelText(/^Amount/), { target: { value: '1,250.50' } });
    fireEvent.change(screen.getByLabelText(/^Tags/), { target: { value: 'Shoes, Gift' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save receipt' }));
    expect(await screen.findByText('Add a photo of the receipt')).toBeInTheDocument();
    expect(state.run).not.toHaveBeenCalled();
    URL.createObjectURL = vi.fn(() => 'blob:preview'); URL.revokeObjectURL = vi.fn();
    fireEvent.change(document.getElementById('rc-photo')!, { target: { files: [new File(['x'], 'r.png', { type: 'image/png' })] } });
    await screen.findByRole('button', { name: 'Change photo' });
    fireEvent.click(screen.getByRole('button', { name: 'Save receipt' }));
    await waitFor(() => expect(state.run).toHaveBeenCalled());
    expect(state.run.mock.calls[0][0]).toMatchObject({ type: 'save', id: null,
      input: { merchant: 'Shoe Shop', amount: 1250.5, tags: ['shoes', 'gift'] }, photo: expect.any(ArrayBuffer) });
  });
  it('has no icon-only buttons on the list or in the add form', async () => {
    page();
    fireEvent.click(screen.getByRole('button', { name: 'Add receipt' }));
    await screen.findByLabelText(/^Store/);
    for (const b of screen.getAllByRole('button')) {
      if (b.closest('[role="dialog"]') && b.textContent?.trim() === '' ) expect(b).toHaveAccessibleName(/Close/);
      else expect(b.textContent?.trim()).not.toBe('');
    }
  });
});

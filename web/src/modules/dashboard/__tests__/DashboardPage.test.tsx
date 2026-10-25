import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardBadgeRepository, billsDueSoon, cardsDueSoon } from '@himan/shared/dashboard';
import type { RentalBill, RentalPayment } from '@himan/shared/rentals';
import { DashboardPage } from '../presentation/pages/DashboardPage';
import { groupByLetter, readHiddenApps } from '../domain/entities';
import { initSupabase } from '@himan/shared';

const auth = vi.hoisted(() => ({
  user: { id: 'u1', email: 'kyle@example.com', user_metadata: {} as Record<string, unknown> },
}));
vi.mock('@auth/presentation/hooks', () => ({ useAuth: () => auth }));

const sub = vi.hoisted(() => ({ tier: 'beta', isAdmin: false }));
vi.mock('@subscriptions/presentation/hooks', () => ({ useSubscription: () => sub }));

// The shared repository saves through the shared client; spy on that client's updateUser.
const client = initSupabase({ url: 'http://localhost:54321', anonKey: 'test-anon-key' });
const supabase = { auth: { updateUser: vi.spyOn(client.auth, 'updateUser') as unknown as ReturnType<typeof vi.fn> } };

const toasts = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast: toasts }));

const badges = vi.spyOn(DashboardBadgeRepository.prototype, 'counts');
const page = () => render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><DashboardPage /></MemoryRouter></QueryClientProvider>);
const apps = () => within(screen.getByRole('navigation', { name: 'Apps' }));
const customize = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Customize' }));
  return within(screen.getByRole('dialog', { name: 'Customize dashboard' }));
};

beforeEach(() => {
  vi.clearAllMocks();
  auth.user.user_metadata = {};
  sub.tier = 'beta';
  sub.isAdmin = false;
  supabase.auth.updateUser.mockResolvedValue({ data: {}, error: null });
  badges.mockResolvedValue({});
});

describe('DashboardPage', () => {
  it('shows every app as a button by default, linking to its module', () => {
    page();
    for (const label of ['Notes', 'Passwords', 'Cards', 'Grocery', 'Rentals', 'Weight', 'Finances', 'Government', 'Receipts', 'Invoices', 'Career', 'Profile']) {
      expect(apps().getByRole('link', { name: label })).toBeInTheDocument();
    }
    expect(apps().getByRole('link', { name: 'Invoices' })).toHaveAttribute('href', '/invoice-generator');
  });

  it('shows Storage only to Enterprise users and admins', () => {
    const { unmount } = page();
    expect(apps().queryByRole('link', { name: 'Storage' })).not.toBeInTheDocument();
    unmount();
    sub.isAdmin = true;
    page();
    expect(apps().getByRole('link', { name: 'Storage' })).toHaveAttribute('href', '/storage');
  });

  it('hides the apps saved as hidden in the account', () => {
    auth.user.user_metadata = { dashboard_hidden_apps: ['notes', 'career'] };
    page();
    expect(apps().queryByRole('link', { name: 'Notes' })).not.toBeInTheDocument();
    expect(apps().queryByRole('link', { name: 'Career' })).not.toBeInTheDocument();
    expect(apps().getByRole('link', { name: 'Rentals' })).toBeInTheDocument();
  });

  it('saves the chosen apps to the account and updates the grid', async () => {
    page();
    const dialog = customize();
    fireEvent.click(dialog.getByRole('switch', { name: 'Notes' }));
    fireEvent.click(dialog.getByRole('switch', { name: 'Grocery' }));
    fireEvent.click(dialog.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(supabase.auth.updateUser).toHaveBeenCalledWith({ data: { dashboard_hidden_apps: ['notes', 'grocery'] } })
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(toasts.success).toHaveBeenCalledWith('Dashboard updated');
    expect(apps().queryByRole('link', { name: 'Notes' })).not.toBeInTheDocument();
    expect(apps().queryByRole('link', { name: 'Grocery' })).not.toBeInTheDocument();
  });

  it('discards unsaved changes on Cancel', () => {
    page();
    const dialog = customize();
    fireEvent.click(dialog.getByRole('switch', { name: 'Notes' }));
    fireEvent.click(dialog.getByRole('button', { name: 'Cancel' }));
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
    expect(apps().getByRole('link', { name: 'Notes' })).toBeInTheDocument();
    expect(customize().getByRole('switch', { name: 'Notes' })).toHaveAttribute('aria-checked', 'true');
  });

  it('brings every app back with Show all', async () => {
    auth.user.user_metadata = { dashboard_hidden_apps: ['notes', 'cards'] };
    page();
    const dialog = customize();
    expect(dialog.getByRole('switch', { name: 'Notes' })).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(dialog.getByRole('button', { name: 'Show all' }));
    fireEvent.click(dialog.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(supabase.auth.updateUser).toHaveBeenCalledWith({ data: { dashboard_hidden_apps: [] } }));
  });

  it('keeps the old layout and the dialog open when saving fails', async () => {
    supabase.auth.updateUser.mockResolvedValue({ data: {}, error: new Error('offline') });
    page();
    const dialog = customize();
    fireEvent.click(dialog.getByRole('switch', { name: 'Notes' }));
    fireEvent.click(dialog.getByRole('button', { name: 'Save' }));
    const banner = await dialog.findByRole('alert');
    expect(banner).toHaveTextContent('Couldn’t save your dashboard. Check your connection and try again.');
    expect(banner).toHaveAttribute('data-form-error');
    expect(toasts.error).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Customize dashboard' })).toBeInTheDocument();
    // The open dialog hides the page from the accessibility tree, so include hidden elements.
    expect(screen.getByRole('link', { name: 'Notes', hidden: true })).toBeInTheDocument();
  });

  it('sorts the apps A–Z under a heading per letter, with a link to each letter', () => {
    auth.user.user_metadata = { dashboard_hidden_apps: ['career'] };
    page();
    const headings = apps().getAllByRole('heading').map((h) => h.textContent);
    expect(headings).toEqual(['C', 'F', 'G', 'I', 'N', 'P', 'R', 'W']);
    expect(within(apps().getByRole('region', { name: 'C' })).getAllByRole('link').map((l) => l.textContent)).toEqual(['Cards']);
    expect(within(apps().getByRole('region', { name: 'P' })).getAllByRole('link').map((l) => l.textContent)).toEqual(['Passwords', 'Profile']);
    const letters = within(screen.getByRole('navigation', { name: 'Jump to letter' })).getAllByRole('link');
    expect(letters.map((l) => l.textContent)).toEqual(headings);
    expect(letters[0]).toHaveAttribute('href', '#apps-C');
  });

  it('badges a tile with how many things need attention, in its label, and none at zero', async () => {
    badges.mockResolvedValue({ rentals: 2, receipts: 1, cards: 0 });
    page();
    expect(await apps().findByRole('link', { name: 'Rentals, 2 need attention' })).toHaveAttribute('href', '/rentals');
    expect(apps().getByRole('link', { name: 'Receipts, 1 needs attention' })).toBeInTheDocument();
    expect(apps().getByRole('link', { name: 'Cards' })).toBeInTheDocument();
    expect(badges).toHaveBeenCalledWith('u1', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
  });

  it('shows no badges when the counts fail to load', async () => {
    badges.mockRejectedValue(new Error('offline'));
    page();
    await waitFor(() => expect(badges).toHaveBeenCalled());
    expect(apps().getByRole('link', { name: 'Rentals' })).toBeInTheDocument();
  });

  it('offers a way back when every app is hidden', () => {
    auth.user.user_metadata = { dashboard_hidden_apps: ['notes', 'passwords', 'cards', 'grocery', 'rentals', 'weight', 'finances', 'government', 'receipts', 'invoices', 'career', 'profile'] };
    page();
    expect(screen.getByText('Your dashboard is empty')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Choose apps' }));
    expect(screen.getByRole('dialog', { name: 'Customize dashboard' })).toBeInTheDocument();
  });
});

describe('groupByLetter', () => {
  it('groups case-insensitively and keeps only letters that have apps', () => {
    expect(groupByLetter([{ label: 'beta' }, { label: 'Alpha' }, { label: 'Bravo' }])).toEqual([
      { letter: 'A', apps: [{ label: 'Alpha' }] },
      { letter: 'B', apps: [{ label: 'beta' }, { label: 'Bravo' }] },
    ]);
    expect(groupByLetter([])).toEqual([]);
  });
});

describe('cardsDueSoon', () => {
  it('counts cards due within 7 days, today included, across the month end', () => {
    expect(cardsDueSoon([26, 2, 3, 10, null], '2026-10-26')).toBe(2);
    expect(cardsDueSoon([31], '2026-02-25')).toBe(1); // 31st clamps to Feb 28
    expect(cardsDueSoon([], '2026-10-26')).toBe(0);
  });
});

describe('billsDueSoon', () => {
  const bill = (id: string, dueOn: string, status: 'issued' | 'void' = 'issued') =>
    ({ id, dueOn, status, lines: [{ amount: 1000 }] }) as unknown as RentalBill;
  const paid = (billId: string, amountCentavos: number) =>
    ({ status: 'active', allocations: [{ billId, amountCentavos }] }) as unknown as RentalPayment;
  it('counts bills still owed that are overdue or due within 7 days', () => {
    const bills = [bill('late', '2026-10-01'), bill('week', '2026-11-02'), bill('later', '2026-11-03'),
      bill('paid', '2026-10-20'), bill('part', '2026-10-27'), bill('void', '2026-10-01', 'void')];
    expect(billsDueSoon(bills, [paid('paid', 1000), paid('part', 400)], '2026-10-26')).toBe(3);
  });
});

describe('readHiddenApps', () => {
  it('ignores unknown ids and malformed values', () => {
    expect(readHiddenApps({ dashboard_hidden_apps: ['notes', 'nope', 3] })).toEqual(['notes']);
    expect(readHiddenApps({ dashboard_hidden_apps: 'notes' })).toEqual([]);
    expect(readHiddenApps(undefined)).toEqual([]);
  });
});

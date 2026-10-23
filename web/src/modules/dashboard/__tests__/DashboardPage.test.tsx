import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardPage } from '../presentation/pages/DashboardPage';
import { readHiddenApps } from '../domain/entities';
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

const page = () => render(<MemoryRouter><DashboardPage /></MemoryRouter>);
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
});

describe('DashboardPage', () => {
  it('shows every app as a button by default, linking to its module', () => {
    page();
    for (const label of ['Notes', 'Passwords', 'Cards', 'Grocery', 'Rentals', 'Weight', 'Finances', 'Government', 'Invoices', 'Career', 'Profile']) {
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

  it('offers a way back when every app is hidden', () => {
    auth.user.user_metadata = { dashboard_hidden_apps: ['notes', 'passwords', 'cards', 'grocery', 'rentals', 'weight', 'finances', 'government', 'invoices', 'career', 'profile'] };
    page();
    expect(screen.getByText('Your dashboard is empty')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Choose apps' }));
    expect(screen.getByRole('dialog', { name: 'Customize dashboard' })).toBeInTheDocument();
  });
});

describe('readHiddenApps', () => {
  it('ignores unknown ids and malformed values', () => {
    expect(readHiddenApps({ dashboard_hidden_apps: ['notes', 'nope', 3] })).toEqual(['notes']);
    expect(readHiddenApps({ dashboard_hidden_apps: 'notes' })).toEqual([]);
    expect(readHiddenApps(undefined)).toEqual([]);
  });
});

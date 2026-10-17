import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { SettingsPage } from '../presentation/pages/SettingsPage';

const auth = vi.hoisted(() => ({
  user: { id: 'user-123', email: 'kyle@example.com', created_at: '2025-10-03T00:00:00Z' } as Record<string, string> | null,
  signOut: vi.fn(async () => {}),
}));
vi.mock('@auth/presentation/hooks', () => ({ useAuth: () => auth }));

const theme = vi.hoisted(() => ({ theme: 'system', setTheme: vi.fn() }));
vi.mock('@core/presentation/contexts/ThemeProvider', () => ({ useTheme: () => theme }));

const stat = (current: number, limit: number | null) => ({ current, limit, percentage: limit ? (current / limit) * 100 : null });
const sub = vi.hoisted(() => ({
  tier: 'beta', role: 'user', isAdmin: false, loading: false,
  usageStats: null as Record<string, ReturnType<typeof stat>> | null,
}));
vi.mock('@subscriptions/presentation/hooks', () => ({ useSubscription: () => sub }));

const toasts = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({ toast: toasts }));

const section = (name: string) => screen.getByRole('region', { name });

beforeEach(() => {
  vi.clearAllMocks();
  theme.theme = 'system';
  sub.isAdmin = false;
  sub.loading = false;
  sub.usageStats = {
    notes: stat(200, 200), folders: stat(3, 20), passwords: stat(8, 100), categories: stat(2, 20),
    cards: stat(1, 10), files: stat(12, 500), storage: stat(300 * 1024 * 1024, 2 * 1024 * 1024 * 1024),
    cardCategories: stat(0, 10), storageFolders: stat(0, 20),
  };
});

describe('SettingsPage', () => {
  it('groups account, plan, and appearance into labelled sections', () => {
    render(<SettingsPage />);
    const account = section('Account');
    expect(within(account).getByText('kyle@example.com')).toBeInTheDocument();
    expect(within(account).getByText('user-123')).toBeInTheDocument();
    expect(within(account).getByText('October 2025')).toBeInTheDocument();
    expect(section('Plan & usage')).toBeInTheDocument();
    expect(section('Appearance')).toBeInTheDocument();
  });

  it('shows usage against the plan limit in one line, with storage in readable units', () => {
    render(<SettingsPage />);
    const plan = section('Plan & usage');
    expect(within(plan).getByText('Beta')).toBeInTheDocument();
    expect(within(plan).getByText('200 of 200')).toBeInTheDocument();
    expect(within(plan).getByText('300 MB of 2 GB')).toBeInTheDocument();
    expect(within(plan).getByText('25,000')).toBeInTheDocument();
    expect(within(plan).queryByText(/Tier Limits/i)).not.toBeInTheDocument();
  });

  it('says "No limit" for uncapped items and tells admins limits do not apply', () => {
    sub.isAdmin = true;
    sub.usageStats!.notes = stat(900, null);
    render(<SettingsPage />);
    const plan = section('Plan & usage');
    expect(within(plan).getByText('Admin')).toBeInTheDocument();
    expect(within(plan).getByText(/No limit/)).toBeInTheDocument();
    expect(within(plan).getByText(/none of these limits apply/)).toBeInTheDocument();
  });

  it('switches theme with a segmented control', () => {
    render(<SettingsPage />);
    const group = screen.getByRole('radiogroup', { name: 'Theme' });
    expect(within(group).getByRole('radio', { name: 'System' })).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(within(group).getByRole('radio', { name: 'Dark' }));
    expect(theme.setTheme).toHaveBeenCalledWith('dark');
  });

  it('copies the user ID', async () => {
    const writeText = vi.fn(async () => {});
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<SettingsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy user ID' }));
    await waitFor(() => expect(toasts.success).toHaveBeenCalledWith('User ID copied'));
    expect(writeText).toHaveBeenCalledWith('user-123');
  });

  it('asks before signing out', async () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(auth.signOut).not.toHaveBeenCalled();
    const dialog = await screen.findByRole('alertdialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Sign out' }));
    expect(auth.signOut).toHaveBeenCalled();
  });
});

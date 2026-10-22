import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { WeightPage } from '../presentation/pages/WeightPage';

const state = vi.hoisted(() => ({
  entries: [] as { id: string; entryDate: string; kg: number }[],
  settings: { heightCm: null as number | null, goalKg: null as number | null },
  userId: 'u', loading: false, error: null, busy: false, refetch: vi.fn(),
  saveEntry: vi.fn(), removeEntry: vi.fn(), saveSettings: vi.fn(),
}));
vi.mock('../presentation/hooks/useWeight', () => ({ useWeight: () => state }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const page = () => render(<MemoryRouter><WeightPage /></MemoryRouter>);
beforeEach(() => {
  vi.clearAllMocks();
  state.entries = []; state.settings = { heightCm: null, goalKg: null }; state.userId = 'u';
});

describe('WeightPage', () => {
  it('invites the first log when empty', () => {
    page();
    expect(screen.getByRole('button', { name: 'Log your first weight' })).toBeInTheDocument();
  });

  it('shows BMI category and goal progress from entries and settings', () => {
    state.entries = [{ id: 'a', entryDate: '2026-10-01', kg: 90 }, { id: 'b', entryDate: '2026-10-10', kg: 80 }];
    state.settings = { heightCm: 180, goalKg: 70 };
    page();
    expect(screen.getByRole('img', { name: 'BMI 24.7, Normal' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
    expect(screen.getByText('10.0 kg to go')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Weight chart: 2 entries.*goal 70/ })).toBeInTheDocument();
  });

  it('asks for height when none is saved', () => {
    state.entries = [{ id: 'a', entryDate: '2026-10-01', kg: 80 }];
    page();
    expect(screen.getByRole('button', { name: 'Add height' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Set a goal' })).toBeInTheDocument();
  });

  it('validates then saves a new entry', async () => {
    page();
    fireEvent.click(screen.getByRole('button', { name: 'Log your first weight' }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save weight' }));
    expect(await within(dialog).findByText('Enter your weight in kg')).toBeInTheDocument();
    expect(state.saveEntry).not.toHaveBeenCalled();
    fireEvent.change(within(dialog).getByLabelText('Weight (kg)'), { target: { value: '72.5' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save weight' }));
    await waitFor(() => expect(state.saveEntry).toHaveBeenCalledWith(expect.objectContaining({ kg: 72.5 })));
  });

  it('confirms before deleting an entry', async () => {
    state.entries = [{ id: 'a', entryDate: '2026-10-01', kg: 80 }];
    page();
    fireEvent.click(screen.getByRole('button', { name: /Delete weight on/ }));
    expect(state.removeEntry).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(state.removeEntry).toHaveBeenCalledWith('a'));
  });

  it('saves height and a cleared goal', async () => {
    state.settings = { heightCm: 170, goalKg: 60 };
    state.entries = [{ id: 'a', entryDate: '2026-10-01', kg: 80 }];
    page();
    fireEvent.click(screen.getByRole('button', { name: /Height & goal/ }));
    fireEvent.change(screen.getByLabelText('Goal weight (kg)'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));
    await waitFor(() => expect(state.saveSettings).toHaveBeenCalledWith({ heightCm: 170, goalKg: null }));
  });
});

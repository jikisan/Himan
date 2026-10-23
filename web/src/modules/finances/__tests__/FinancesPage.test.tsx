import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FinancesPage } from '../presentation/pages/FinancesPage';
import type { FinanceCategory, FinanceTransaction } from '@himan/shared/finances';

const categories: FinanceCategory[] = [
  { id: 'food', kind: 'expense', name: 'Food', color: '#f97316' },
  { id: 'salary', kind: 'income', name: 'Salary', color: '#22c55e' },
];
const month = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date()).slice(0, 7);
const tx = (id: string, kind: 'income' | 'expense', amountCentavos: number, categoryId: string, note: string): FinanceTransaction =>
  ({ id, kind, amountCentavos, occurredOn: `${month}-02`, note, categoryId });

const state = vi.hoisted(() => ({ userId: 'u', categories: [] as FinanceCategory[], transactions: [] as FinanceTransaction[],
  loading: false, error: null, refetch: vi.fn(), busy: false, run: vi.fn() }));
vi.mock('../presentation/hooks/useFinances', () => ({ useFinances: () => state }));

beforeEach(() => {
  vi.clearAllMocks();
  Object.assign(state, { userId: 'u', categories, loading: false, error: null,
    transactions: [tx('a', 'income', 500000, 'salary', 'October pay'), tx('b', 'expense', 25050, 'food', 'Market')] });
  state.run.mockResolvedValue(undefined);
});
const page = () => render(<MemoryRouter><FinancesPage /></MemoryRouter>);

describe('FinancesPage', () => {
  it('shows monthly totals', () => {
    page();
    const totals = within(screen.getByRole('region', { name: 'Totals' }));
    expect(totals.getByText('₱5,000.00')).toBeInTheDocument();
    expect(totals.getByText('₱250.50')).toBeInTheDocument();
    expect(totals.getByText('₱4,749.50')).toBeInTheDocument();
  });
  it('filters the list by search', async () => {
    page();
    fireEvent.change(screen.getByLabelText('Search transactions'), { target: { value: 'market' } });
    expect(screen.getByRole('button', { name: /Edit Food/ })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole('button', { name: /Edit Salary/ })).not.toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Search transactions'), { target: { value: 'zzz' } });
    expect(screen.getByText('Nothing matches your search')).toBeInTheDocument();
  });
  it('validates and saves a new expense in centavos', async () => {
    page();
    fireEvent.click(screen.getByRole('button', { name: 'Add transaction' }));
    const dialog = within(screen.getByRole('dialog'));
    fireEvent.click(dialog.getByRole('button', { name: 'Save' }));
    expect(await dialog.findByRole('alert')).toHaveTextContent('Enter an amount');
    fireEvent.change(dialog.getByLabelText(/Amount/), { target: { value: '19.99' } });
    fireEvent.change(dialog.getByLabelText('Category'), { target: { value: 'food' } });
    fireEvent.click(dialog.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith(expect.objectContaining({
      type: 'saveTransaction', id: null, input: expect.objectContaining({ kind: 'expense', amountCentavos: 1999, categoryId: 'food' }) })));
  });
  it('asks before deleting a transaction', async () => {
    page();
    fireEvent.click(screen.getByRole('button', { name: /Delete Food/ }));
    expect(state.run).not.toHaveBeenCalled();
    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(state.run).toHaveBeenCalledWith({ type: 'deleteTransaction', id: 'b' }));
  });
  it('disables Next on the current month', () => {
    page();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });
});

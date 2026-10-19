import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

// Radix Popover isn't pre-bundled for tests; render its content inline.
vi.mock('@/components/ui', async (original) => {
  const ui = await original<typeof import('@/components/ui')>();
  const Pass = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
  return { ...ui, Popover: Pass, PopoverTrigger: Pass, PopoverContent: Pass };
});
import { SavedOptionSelect } from '../presentation/components/SavedOptionSelect';

const open = (onSaveCurrent = vi.fn()) => {
  render(<SavedOptionSelect options={[]} currentValue="Acme Inc" onSelect={vi.fn()} onSaveCurrent={onSaveCurrent} onManage={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: /Save Current/ }));
};

describe('SavedOptionSelect save errors', () => {
  it('focuses an empty label and shows the message under it', async () => {
    const save = vi.fn();
    open(save);
    const label = screen.getByLabelText('Label for this entry');
    expect(label).toBeRequired();
    fireEvent.click(screen.getByRole('button', { name: 'Save option' }));
    await waitFor(() => expect(document.activeElement).toBe(label));
    expect(label).toHaveAttribute('aria-invalid', 'true');
    expect(document.getElementById(label.getAttribute('aria-describedby')!)).toHaveTextContent('Enter a label');
    expect(save).not.toHaveBeenCalled();
  });
  it('keeps the label open with a failed save under it', async () => {
    open(vi.fn().mockRejectedValue(new Error('x')));
    fireEvent.change(screen.getByLabelText('Label for this entry'), { target: { value: 'Mine' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save option' }));
    const label = screen.getByLabelText('Label for this entry');
    await waitFor(() => expect(label).toHaveAttribute('aria-invalid', 'true'));
    expect(document.getElementById(label.getAttribute('aria-describedby')!)).toHaveTextContent('Failed to save option');
  });
});

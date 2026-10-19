import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PasswordDialog } from '../presentation/components/PasswordDialog';

const open = (onSave = vi.fn(), onOpenChange = vi.fn()) =>
  render(<PasswordDialog open onOpenChange={onOpenChange} categories={[]} onSave={onSave} />);
const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Add Password' }));

describe('PasswordDialog form errors', () => {
  it('marks title and password as required', () => {
    open();
    for (const input of [screen.getByLabelText(/^Title/), screen.getByLabelText(/^Password/)]) {
      expect(input).toBeRequired();
      expect(document.querySelector(`label[for="${input.id}"] [aria-hidden="true"]`)).toHaveTextContent('*');
    }
  });
  it('focuses the first empty field and shows messages under the fields', async () => {
    const onSave = vi.fn();
    open(onSave);
    submit();
    const title = screen.getByLabelText(/^Title/);
    await waitFor(() => expect(document.activeElement).toBe(title));
    expect(title).toHaveAttribute('aria-invalid', 'true');
    expect(document.getElementById('title-error')).toHaveTextContent('Enter a title');
    expect(document.getElementById('password-error')).toHaveTextContent('Enter a password');
    fireEvent.change(title, { target: { value: 'Gmail' } });
    expect(title).not.toHaveAttribute('aria-invalid');
    submit();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText(/^Password/)));
    expect(onSave).not.toHaveBeenCalled();
  });
  it('keeps the dialog open with a save failure in the top banner', async () => {
    const onOpenChange = vi.fn();
    open(vi.fn().mockRejectedValue(new Error('Password limit reached')), onOpenChange);
    fireEvent.change(screen.getByLabelText(/^Title/), { target: { value: 'Gmail' } });
    fireEvent.change(screen.getByLabelText(/^Password/), { target: { value: 'secret' } });
    submit();
    const banner = await screen.findByRole('alert');
    expect(banner).toHaveTextContent('Password limit reached');
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});

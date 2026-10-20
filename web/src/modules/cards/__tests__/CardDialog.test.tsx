import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CardDialog } from '../presentation/components/CardDialog';

const open = (onSave = vi.fn()) => render(<CardDialog open onOpenChange={vi.fn()} categories={[]} onSave={onSave} />);
const submit = () => fireEvent.click(screen.getByRole('button', { name: 'Add Card' }));

describe('CardDialog form errors', () => {
  it('marks the mandatory fields as required', () => {
    open();
    for (const name of [/Card Name/, /Card Number/, /^CVV/]) {
      const input = screen.getByLabelText(name);
      expect(input).toBeRequired();
      expect(document.querySelector(`label[for="${input.id}"] [aria-hidden="true"]`)).toHaveTextContent('*');
    }
  });
  it('focuses the first invalid field and shows each message under its field', async () => {
    const onSave = vi.fn();
    open(onSave);
    submit();
    const name = screen.getByLabelText(/Card Name/);
    await waitFor(() => expect(document.activeElement).toBe(name));
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(document.getElementById('cardName-error')).toHaveTextContent('Card name is required');
    expect(document.getElementById('cardNumber-error')).toHaveTextContent('Card number is required');
    expect(document.getElementById('cvv-error')).toHaveTextContent('CVV is required');
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.change(name, { target: { value: 'Visa' } });
    expect(name).not.toHaveAttribute('aria-invalid');
    fireEvent.change(screen.getByLabelText(/Card Number/), { target: { value: '4111 1111 1111 1112' } });
    submit();
    const number = screen.getByLabelText(/Card Number/);
    await waitFor(() => expect(document.activeElement).toBe(number));
    expect(document.getElementById('cardNumber-error')).toHaveTextContent('Invalid card number (Luhn check failed)');
  });
  it('shows a save refusal in the banner at the top', async () => {
    open(vi.fn().mockRejectedValue(new Error('Card limit reached')));
    fireEvent.change(screen.getByLabelText(/Card Name/), { target: { value: 'Visa' } });
    fireEvent.change(screen.getByLabelText(/Card Number/), { target: { value: '4111 1111 1111 1111' } });
    fireEvent.change(screen.getByLabelText(/^CVV/), { target: { value: '123' } });
    submit();
    const banner = await screen.findByRole('alert');
    expect(banner).toHaveTextContent('Card limit reached');
    expect(banner).toHaveAttribute('data-form-error');
  });
});

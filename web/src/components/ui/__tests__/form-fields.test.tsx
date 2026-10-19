import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Label } from '../label';
import { Input } from '../input';
import { Textarea } from '../textarea';
import { Select, SelectTrigger, SelectValue } from '../select';
import { Field, inputClass } from '@/modules/rentals/presentation/components/Field';

describe('Label required marker', () => {
  it('renders a hidden asterisk only when required', () => {
    const { rerender } = render(<Label>Name</Label>);
    expect(screen.getByText('Name').textContent).toBe('Name');
    rerender(<Label required>Name</Label>);
    const star = screen.getByText('*');
    expect(star).toHaveAttribute('aria-hidden', 'true');
    expect(star).toHaveClass('text-destructive');
  });
});

describe('invalid styling', () => {
  it.each([
    ['input', () => <Input aria-invalid data-testid="el" />],
    ['textarea', () => <Textarea aria-invalid data-testid="el" />],
    ['select', () => <Select><SelectTrigger aria-invalid data-testid="el"><SelectValue /></SelectTrigger></Select>],
  ])('%s carries the aria-invalid destructive classes', (_, el) => {
    render(el());
    expect(screen.getByTestId('el')).toHaveClass('aria-invalid:border-destructive', 'aria-invalid:ring-2');
  });

  it('rentals inputClass carries them too', () => {
    expect(inputClass).toContain('aria-invalid:border-destructive');
  });
});

describe('rentals Field', () => {
  it('marks required and renders the error under the control', () => {
    render(<Field id="rent" label="Rent" required error="Enter the rent"><input id="rent" /></Field>);
    expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('Enter the rent')).toHaveAttribute('id', 'rent-error');
  });

  it('renders no error element without an error', () => {
    const { container } = render(<Field id="rent" label="Rent"><input id="rent" /></Field>);
    expect(container.querySelector('#rent-error')).toBeNull();
  });
});

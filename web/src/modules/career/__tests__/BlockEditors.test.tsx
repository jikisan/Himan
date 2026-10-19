import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BlockEditor } from '../presentation/components/BlockEditor';
import { CvBlockEditor } from '../presentation/components/CvBlockEditor';

const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save block' }));
const marked = (input: HTMLElement) => document.querySelector(`label[for="${input.id}"]`)?.textContent?.includes('*');

describe('BlockEditor form errors', () => {
  const open = (onSave = vi.fn()) => render(<BlockEditor open onOpenChange={vi.fn()} block={null} onSave={onSave} />);

  it('marks label and body as required', () => {
    open();
    for (const input of [screen.getByLabelText(/^Label/), screen.getByLabelText(/^Body/)]) {
      expect(input).toBeRequired();
      expect(marked(input)).toBe(true);
    }
  });
  it('focuses the first empty field and shows its message under it', async () => {
    const onSave = vi.fn();
    open(onSave);
    save();
    const label = screen.getByLabelText(/^Label/);
    await waitFor(() => expect(document.activeElement).toBe(label));
    expect(label).toHaveAttribute('aria-invalid', 'true');
    expect(document.getElementById('label-error')).toHaveTextContent('Enter a label');
    expect(document.getElementById('body-error')).toHaveTextContent('Enter the block text');
    fireEvent.change(label, { target: { value: 'Android' } });
    expect(label).not.toHaveAttribute('aria-invalid');
    save();
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText(/^Body/)));
    expect(onSave).not.toHaveBeenCalled();
  });
  it('shows a save failure in the banner at the top', async () => {
    open(vi.fn().mockRejectedValue(new Error('nope')));
    fireEvent.change(screen.getByLabelText(/^Label/), { target: { value: 'Android' } });
    fireEvent.change(screen.getByLabelText(/^Body/), { target: { value: 'Hi' } });
    save();
    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to save block');
  });
});

describe('CvBlockEditor form errors', () => {
  const open = (onSave = vi.fn()) => render(<CvBlockEditor open onOpenChange={vi.fn()} block={null} tokens={[]} onSave={onSave} />);

  it('focuses the empty title, marks it required and shows the message under it', async () => {
    open();
    const title = screen.getByLabelText(/^Title/);
    expect(title).toBeRequired();
    expect(marked(title)).toBe(true);
    save();
    await waitFor(() => expect(document.activeElement).toBe(title));
    expect(title).toHaveAttribute('aria-invalid', 'true');
    expect(document.getElementById('cv-block-title-error')).toHaveTextContent('Enter a title');
  });
  it('shows a save failure in the banner at the top', async () => {
    open(vi.fn().mockRejectedValue(new Error('nope')));
    fireEvent.change(screen.getByLabelText(/^Title/), { target: { value: 'Objective' } });
    save();
    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to save CV block');
  });
});

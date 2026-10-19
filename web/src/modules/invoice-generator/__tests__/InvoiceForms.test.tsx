import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InvoiceLineItems } from '../presentation/components/InvoiceLineItems';
import { FolderSettingsDialog } from '../presentation/components/FolderSettingsDialog';
import { SavedOptionDialog } from '../presentation/components/SavedOptionDialog';
import { InvoiceGenerator } from '../presentation/components/InvoiceGenerator';
import type { InvoiceFolder } from '../domain/entities/InvoiceFolder';

const hooks = vi.hoisted(() => ({ createInvoice: vi.fn(), generateLocal: vi.fn() }));
vi.mock('../presentation/hooks/useInvoiceFolders', () => ({ useInvoiceFolders: () => ({ folders: [], loading: false,
  createFolder: vi.fn(), updateFolder: vi.fn(), deleteFolder: vi.fn(), incrementSequence: vi.fn() }) }));
vi.mock('../presentation/hooks/useInvoices', () => ({ useInvoices: () => ({ invoices: [], loading: false,
  createInvoice: hooks.createInvoice, updateInvoice: vi.fn(), deleteInvoice: vi.fn() }) }));
vi.mock('../presentation/hooks/useSavedOptions', () => ({ useSavedOptions: () => ({
  optionsByType: { company_details: [], bill_to: [], notes: [], bank_details: [] }, createOption: vi.fn(), updateOption: vi.fn(), deleteOption: vi.fn() }) }));
vi.mock('../presentation/hooks/useInvoicePDF', () => ({ useInvoicePDF: () => ({ generateLocal: hooks.generateLocal,
  generateAndSave: vi.fn(), isGenerating: false, uploadError: null }) }));
// Radix Popover isn't pre-bundled for tests, so stub the two popover-based widgets the page renders.
vi.mock('@/components/ui', async (original) => ({ ...await original<typeof import('@/components/ui')>(), DatePicker: () => null }));
vi.mock('../presentation/components/SavedOptionSelect', () => ({ SavedOptionSelect: () => null }));
vi.mock('../presentation/hooks/useInvoiceNumber', () => ({ useInvoiceNumber: () => ({ getNextInvoiceNumber: () => null }) }));

beforeEach(() => { vi.clearAllMocks(); });
const marked = (input: HTMLElement) => document.querySelector(`label[for="${input.id}"] [aria-hidden="true"]`)?.textContent;

describe('InvoiceGenerator invoice number', () => {
  it('focuses the empty invoice number instead of a note under the form', async () => {
    render(<InvoiceGenerator />);
    const number = screen.getByLabelText(/Invoice Number/);
    expect(number).toBeRequired();
    expect(marked(number)).toContain('*');
    fireEvent.change(number, { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /Generate PDF/ }));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText(/Invoice Number/)));
    expect(screen.getByLabelText(/Invoice Number/)).toHaveAttribute('aria-invalid', 'true');
    expect(document.getElementById('invoiceNumber-error')).toHaveTextContent('Please enter an Invoice Number.');
    expect(hooks.generateLocal).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(/Invoice Number/), { target: { value: 'INV-1' } });
    expect(screen.getByLabelText(/Invoice Number/)).not.toHaveAttribute('aria-invalid');
  });
  it('shows a failed metadata save in the banner at the top', async () => {
    hooks.createInvoice.mockResolvedValue(null);
    render(<InvoiceGenerator />);
    fireEvent.click(screen.getByRole('checkbox', { name: /Upload to Supabase/ }));
    fireEvent.change(screen.getByLabelText(/Invoice Number/), { target: { value: 'INV-1' } });
    fireEvent.click(screen.getByRole('button', { name: /Generate & Upload/ }));
    const banner = await screen.findByRole('alert');
    expect(banner).toHaveTextContent('Failed to save invoice metadata. PDF will still be downloaded locally.');
    expect(banner).toHaveAttribute('data-form-error');
  });
});

describe('InvoiceLineItems bulk import', () => {
  it('focuses the bulk text and shows the parse errors under it', async () => {
    const onChange = vi.fn();
    render(<InvoiceLineItems items={[]} currency="PHP" onChange={onChange} bulkDialogOpen onBulkDialogOpenChange={vi.fn()} />);
    const text = screen.getByLabelText(/Line items/);
    expect(text).toBeRequired();
    fireEvent.change(text, { target: { value: 'Design | abc | 1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Replace All' }));
    await waitFor(() => expect(document.activeElement).toBe(text));
    expect(text).toHaveAttribute('aria-invalid', 'true');
    expect(document.getElementById('bulk-items-error')).toHaveTextContent('Line 1: "abc" is not a valid unit cost');
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('FolderSettingsDialog errors', () => {
  const folder = { id: 'f', name: 'Acme', invoiceNumberPrefix: null, invoiceNumberFormat: 'INV-{NNN}', nextSequenceNumber: 1 } as InvoiceFolder;
  it('focuses an empty format', async () => {
    const onSave = vi.fn();
    render(<FolderSettingsDialog open onOpenChange={vi.fn()} folder={folder} onSave={onSave} />);
    const format = screen.getByLabelText(/Format Pattern/);
    expect(format).toBeRequired();
    fireEvent.change(format, { target: { value: ' ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Settings' }));
    await waitFor(() => expect(document.activeElement).toBe(format));
    expect(document.getElementById('format-error')).toHaveTextContent('Enter a format pattern');
    expect(onSave).not.toHaveBeenCalled();
  });
  it('keeps the dialog open with the failure in the top banner', async () => {
    const onOpenChange = vi.fn();
    render(<FolderSettingsDialog open onOpenChange={onOpenChange} folder={folder} onSave={vi.fn().mockRejectedValue(new Error('x'))} />);
    fireEvent.click(screen.getByRole('button', { name: 'Save Settings' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to save folder settings');
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});

describe('SavedOptionDialog errors', () => {
  const open = (onSave = vi.fn()) => render(<SavedOptionDialog open onOpenChange={vi.fn()} optionType="notes" options={[]}
    onSave={onSave} onUpdate={vi.fn()} onDelete={vi.fn()} />);
  it('focuses the empty label of a new option and shows messages under the fields', async () => {
    const onSave = vi.fn();
    open(onSave);
    const label = screen.getByLabelText(/^Label/);
    expect(label).toBeRequired();
    expect(marked(label)).toContain('*');
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    await waitFor(() => expect(document.activeElement).toBe(label));
    expect(label).toHaveAttribute('aria-invalid', 'true');
    expect(document.getElementById('saved-option-label-error')).toHaveTextContent('Enter a label');
    expect(document.getElementById('saved-option-value-error')).toHaveTextContent('Enter the content');
    expect(onSave).not.toHaveBeenCalled();
  });
  it('shows a failed save in the banner at the top', async () => {
    open(vi.fn().mockRejectedValue(new Error('x')));
    fireEvent.change(screen.getByLabelText(/^Label/), { target: { value: 'Mine' } });
    fireEvent.change(screen.getByLabelText(/^Content/), { target: { value: 'Text' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    const dialog = screen.getByRole('dialog');
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Failed to save option');
  });
});

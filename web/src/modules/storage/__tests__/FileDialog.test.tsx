import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FileDialog } from '../presentation/components/FileDialog';
import type { File } from '../domain/entities';

vi.mock('../infrastructure/services', () => ({ StorageService: { download: vi.fn(), getPublicUrl: (p: string) => p } }));

const file = { id: 'f', name: 'report.pdf', folderId: null, description: null, thumbnailUrl: null, isImage: false, isVideo: false,
  isDocument: true, formattedSize: '1 KB', mimeType: 'application/pdf', extension: 'pdf', getRelativeTime: () => 'now' } as unknown as File;
const open = (onSave = vi.fn(), onOpenChange = vi.fn()) =>
  render(<FileDialog file={file} folders={[]} open onOpenChange={onOpenChange} onSave={onSave} />);

describe('FileDialog form errors', () => {
  it('focuses an empty file name and shows the message under it', async () => {
    const onSave = vi.fn();
    open(onSave);
    const name = screen.getByLabelText(/File Name/);
    expect(name).toBeRequired();
    expect(document.querySelector('label[for="name"] [aria-hidden="true"]')).toHaveTextContent('*');
    fireEvent.change(name, { target: { value: ' ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    await waitFor(() => expect(document.activeElement).toBe(name));
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(document.getElementById('name-error')).toHaveTextContent('Enter a file name');
    expect(onSave).not.toHaveBeenCalled();
  });
  it('keeps the dialog open with a save failure in the top banner', async () => {
    const onOpenChange = vi.fn();
    open(vi.fn().mockRejectedValue(new Error('x')), onOpenChange);
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to save file');
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PortfolioSharePanel } from '../presentation/components/PortfolioSharePanel';

const media = vi.hoisted(() => ({ upload: vi.fn(), remove: vi.fn() }));
vi.mock('@auth/presentation/hooks', () => ({ useAuth: () => ({ user: { id: 'owner' } }) }));
vi.mock('@himan/shared/profile', () => ({
  ProjectMediaService: class {
    static acceptedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    static publicUrl(path: string) { return `https://media.example/${path}`; }
    upload = media.upload;
    remove = media.remove;
  },
}));

beforeEach(() => {
  vi.resetAllMocks();
  media.upload.mockResolvedValue('owner/new.png');
  media.remove.mockResolvedValue(undefined);
});

function uploadPhoto() {
  const file = new File(['photo'], 'photo.png', { type: 'image/png' });
  fireEvent.change(screen.getByLabelText('Upload hero photo'), { target: { files: [file] } });
}

describe('portfolio photo settings', () => {
  it('saves the uploaded path before deleting the old portrait', async () => {
    const save = vi.fn().mockImplementation(async () => {
      expect(media.remove).not.toHaveBeenCalled();
    });
    render(<PortfolioSharePanel shareToken="token" enabled showEmail={false} portraitPath="owner/old.png" onChange={save} />);
    uploadPhoto();
    await waitFor(() => expect(media.remove).toHaveBeenCalledWith(['owner/old.png']));
    expect(save).toHaveBeenCalledWith({ portfolioPortraitPath: 'owner/new.png' });
    expect(media.upload).toHaveBeenCalledWith('owner', expect.any(Uint8Array), 'image/png');
  });

  it('keeps the old portrait when saving fails and removes the new orphan', async () => {
    const save = vi.fn().mockRejectedValue(new Error('save failed'));
    render(<PortfolioSharePanel shareToken="token" enabled showEmail={false} portraitPath="owner/old.png" onChange={save} />);
    uploadPhoto();
    await waitFor(() => expect(media.remove).toHaveBeenCalledWith(['owner/new.png']));
    expect(media.remove).not.toHaveBeenCalledWith(['owner/old.png']);
    expect(screen.getByRole('img', { name: 'Portfolio photo preview' })).toHaveAttribute('src', 'https://media.example/owner/old.png');
  });

  it('rejects unsupported files without uploading', () => {
    render(<PortfolioSharePanel shareToken="token" enabled showEmail={false} portraitPath={null} onChange={vi.fn()} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add photo' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Upload hero photo'), { target: { files: [new File(['text'], 'photo.svg', { type: 'image/svg+xml' })] } });
    expect(media.upload).not.toHaveBeenCalled();
  });

  it('removes the photo only after saving succeeds', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    render(<PortfolioSharePanel shareToken="token" enabled showEmail={false} portraitPath="owner/old.png" onChange={save} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove photo' }));
    await waitFor(() => expect(media.remove).toHaveBeenCalledWith(['owner/old.png']));
    expect(save).toHaveBeenCalledWith({ portfolioPortraitPath: null });
  });
});

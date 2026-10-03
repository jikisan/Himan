import type { ComponentProps, ReactElement } from 'react';
import { fireEvent, render as rtlRender, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PortfolioSharePanel } from '../presentation/components/PortfolioSharePanel';

const media = vi.hoisted(() => ({ upload: vi.fn(), remove: vi.fn() }));
const profiles = vi.hoisted(() => ({ upsert: vi.fn() }));
vi.mock('@auth/presentation/hooks', () => ({ useAuth: () => ({ user: { id: 'owner' } }) }));
vi.mock('../../profile/presentation/hooks', () => ({ profileKeys: { all: ['profile'] } }));
vi.mock('@himan/shared/profile', () => ({
  ProfileRepository: class {
    upsert = profiles.upsert;
  },
  ProjectMediaService: class {
    static acceptedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    static publicUrl(path: string) { return `https://media.example/${path}`; }
    upload = media.upload;
    remove = media.remove;
  },
}));

const render = (ui: ReactElement) =>
  rtlRender(<MemoryRouter><QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider></MemoryRouter>);

type PanelProps = ComponentProps<typeof PortfolioSharePanel>;
const Panel = (props: Partial<PanelProps> & Pick<PanelProps, 'onChange'>) => (
  <PortfolioSharePanel shareToken="token" slug="android-developer" handle="junekyle" enabled showEmail={false} portraitPath={null} {...props} />
);

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
    render(<Panel portraitPath="owner/old.png" onChange={save} />);
    uploadPhoto();
    await waitFor(() => expect(media.remove).toHaveBeenCalledWith(['owner/old.png']));
    expect(save).toHaveBeenCalledWith({ portfolioPortraitPath: 'owner/new.png' });
    expect(media.upload).toHaveBeenCalledWith('owner', expect.any(Uint8Array), 'image/png');
  });

  it('keeps the old portrait when saving fails and removes the new orphan', async () => {
    const save = vi.fn().mockRejectedValue(new Error('save failed'));
    render(<Panel portraitPath="owner/old.png" onChange={save} />);
    uploadPhoto();
    await waitFor(() => expect(media.remove).toHaveBeenCalledWith(['owner/new.png']));
    expect(media.remove).not.toHaveBeenCalledWith(['owner/old.png']);
    expect(screen.getByRole('img', { name: 'Portfolio photo preview' })).toHaveAttribute('src', 'https://media.example/owner/old.png');
  });

  it('rejects unsupported files without uploading', () => {
    render(<Panel portraitPath={null} onChange={vi.fn()} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Add photo/ })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Upload hero photo'), { target: { files: [new File(['text'], 'photo.svg', { type: 'image/svg+xml' })] } });
    expect(media.upload).not.toHaveBeenCalled();
  });

  it('removes the photo only after saving succeeds', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    render(<Panel portraitPath="owner/old.png" onChange={save} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove photo' }));
    await waitFor(() => expect(media.remove).toHaveBeenCalledWith(['owner/old.png']));
    expect(save).toHaveBeenCalledWith({ portfolioPortraitPath: null });
  });
});

describe('portfolio link settings', () => {
  const editLink = (handle: string, slug: string) => {
    fireEvent.change(screen.getByLabelText('Your handle'), { target: { value: handle } });
    fireEvent.change(screen.getByLabelText('Portfolio slug'), { target: { value: slug } });
    fireEvent.click(screen.getByRole('button', { name: 'Save link' }));
  };

  it('shows the readable link and hides Save until something changes', () => {
    render(<Panel onChange={vi.fn()} />);
    expect(screen.getByLabelText('Your handle')).toHaveValue('junekyle');
    expect(screen.getByLabelText('Portfolio slug')).toHaveValue('android-developer');
    expect(screen.queryByRole('button', { name: 'Save link' })).not.toBeInTheDocument();
  });

  it('saves a cleaned slug without touching the handle', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    render(<Panel onChange={save} />);
    editLink('junekyle', 'Android Dev ');
    await waitFor(() => expect(save).toHaveBeenCalledWith({ portfolioSlug: 'android-dev' }));
    expect(profiles.upsert).not.toHaveBeenCalled();
  });

  it('stops when the handle is taken, leaving the slug alone', async () => {
    profiles.upsert.mockRejectedValue(new Error('duplicate'));
    const save = vi.fn();
    render(<Panel onChange={save} />);
    editLink('taken', 'android-dev');
    await waitFor(() => expect(profiles.upsert).toHaveBeenCalledWith({ userId: 'owner', handle: 'taken' }));
    expect(save).not.toHaveBeenCalled();
  });

  it('rejects a handle shorter than 3 characters', () => {
    const save = vi.fn();
    render(<Panel onChange={save} />);
    editLink('jk', 'android-developer');
    expect(profiles.upsert).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });
});
